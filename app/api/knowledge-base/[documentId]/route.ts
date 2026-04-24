import { getServerSession } from "next-auth/next";

import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * DELETE /api/knowledge-base/:documentId
 * Remove a document and its chunks (cascade handled by Prisma).
 * The ownership check ensures users can only delete their own docs.
 */
export async function DELETE(
    _request: Request,
    { params }: { params: { documentId: string } },
) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return new Response("Unauthorized", { status: 403 });
        }

        const doc = await db.knowledgeBaseDocument.findUnique({
            where: { id: params.documentId },
            select: { id: true, userId: true },
        });

        if (!doc) {
            return new Response("Not found", { status: 404 });
        }
        if (doc.userId !== session.user.id) {
            return new Response("Forbidden", { status: 403 });
        }

        await db.knowledgeBaseDocument.delete({ where: { id: doc.id } });

        return new Response(null, { status: 204 });
    } catch (error) {
        console.error("[DELETE /api/knowledge-base/:id]", error);
        return new Response(null, { status: 500 });
    }
}
