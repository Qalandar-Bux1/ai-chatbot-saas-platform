import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";
import { z } from "zod";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { ingestText } from "@/lib/rag";

export const maxDuration = 60;

const bodySchema = z.object({
    name: z.string().trim().min(1, "Name is required").max(200),
    content: z.string().trim().min(1, "Content is required").max(200_000),
    chatbotId: z.string().cuid().optional().nullable(),
});

/**
 * POST /api/knowledge-base/add-text
 * Ingest raw text or FAQs pasted by the user.
 */
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 403 });
        }

        const json = await request.json().catch(() => null);
        const parsed = bodySchema.safeParse(json);
        if (!parsed.success) {
            return NextResponse.json(
                { error: "Invalid body", issues: parsed.error.flatten() },
                { status: 422 },
            );
        }

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

        const result = await ingestText({
            userId: session.user.id,
            chatbotId: parsed.data.chatbotId ?? null,
            name: parsed.data.name,
            source: "text",
            content: parsed.data.content,
            apiKey: openAIConfig.globalAPIKey,
        });

        return NextResponse.json(
            {
                documentId: result.documentId,
                chunkCount: result.chunkCount,
                charCount: result.charCount,
            },
            { status: 201 },
        );
    } catch (error: any) {
        console.error("[POST /api/knowledge-base/add-text]", error);
        const message = error?.message ?? "Failed to ingest text.";
        return new Response(message, { status: 500 });
    }
}
