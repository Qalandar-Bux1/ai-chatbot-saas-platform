import { getServerSession } from "next-auth/next";
import { NextResponse } from "next/server";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * GET /api/knowledge-base
 * List every document in the current user's knowledge base. Optionally
 * filter by ?chatbotId=... when the dashboard is scoped to one bot.
 */
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const chatbotId = searchParams.get("chatbotId");

        const documents = await db.knowledgeBaseDocument.findMany({
            where: {
                userId: session.user.id,
                ...(chatbotId ? { chatbotId } : {}),
            },
            select: {
                id: true,
                name: true,
                source: true,
                blobUrl: true,
                charCount: true,
                createdAt: true,
                chatbotId: true,
                _count: { select: { chunks: true } },
            },
            orderBy: { createdAt: "desc" },
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("[GET /api/knowledge-base]", error);
        return new Response(null, { status: 500 });
    }
}
