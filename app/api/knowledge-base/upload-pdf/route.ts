import { put } from "@vercel/blob";
import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { extractPdf, ingestText } from "@/lib/rag";

export const maxDuration = 60;

const querySchema = z.object({
    chatbotId: z.string().cuid().optional().nullable(),
});

/**
 * POST /api/knowledge-base/upload-pdf
 *
 * Accepts either:
 *   - multipart/form-data with a `file` field (recommended), or
 *   - a raw PDF stream as the request body with `?filename=` in the URL
 *
 * Workflow:
 *   1. Auth + fetch the user's OpenAI key
 *   2. Store the PDF in Vercel Blob (so the user can re-download it)
 *   3. Extract text via `pdf-parse`
 *   4. Chunk + embed + persist via `ingestText`
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const parsed = querySchema.safeParse({
            chatbotId: searchParams.get("chatbotId"),
        });
        const chatbotId = parsed.success ? parsed.data.chatbotId ?? null : null;

        const openAIConfig = await db.openAIConfig.findUnique({
            where: { userId: session.user.id },
            select: { globalAPIKey: true },
        });
        if (!openAIConfig?.globalAPIKey) {
            return new Response(
                "Missing OpenAI API key. Add your API key in the Settings tab.",
                { status: 400 },
            );
        }

        const contentType = request.headers.get("content-type") ?? "";
        let pdfBuffer: Buffer;
        let filename: string;

        if (contentType.includes("multipart/form-data")) {
            const form = await request.formData();
            const file = form.get("file");
            if (!(file instanceof File)) {
                return new Response("Missing file field.", { status: 400 });
            }
            if (!file.name.toLowerCase().endsWith(".pdf")) {
                return new Response("Only .pdf files are supported.", { status: 400 });
            }
            pdfBuffer = Buffer.from(await file.arrayBuffer());
            filename = file.name;
        } else {
            const urlFilename = searchParams.get("filename");
            if (!urlFilename || !request.body) {
                return new Response("Missing filename or body.", { status: 400 });
            }
            if (!urlFilename.toLowerCase().endsWith(".pdf")) {
                return new Response("Only .pdf files are supported.", { status: 400 });
            }
            const buf = await request.arrayBuffer();
            pdfBuffer = Buffer.from(buf);
            filename = urlFilename;
        }

        const blob = await put(`knowledge-base/${session.user.id}/${Date.now()}-${filename}`, pdfBuffer, {
            access: "public",
            contentType: "application/pdf",
        });

        const extracted = await extractPdf(pdfBuffer);

        const result = await ingestText({
            userId: session.user.id,
            chatbotId,
            name: filename,
            source: "pdf",
            content: extracted.text,
            blobUrl: blob.url,
            apiKey: openAIConfig.globalAPIKey,
        });

        return NextResponse.json(
            {
                documentId: result.documentId,
                chunkCount: result.chunkCount,
                pages: extracted.pages,
                charCount: result.charCount,
                blobUrl: blob.url,
            },
            { status: 201 },
        );
    } catch (error: any) {
        console.error("[POST /api/knowledge-base/upload-pdf]", error);
        const message = error?.message ?? "Failed to ingest PDF.";
        return new Response(message, { status: 500 });
    }
}
