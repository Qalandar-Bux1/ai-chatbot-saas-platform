import { db } from "@/lib/db";
import { embedQuery } from "./embeddings";
import { topKByCosine, type StoredChunk } from "./similarity";
import type { ScoredChunk } from "./types";

/**
 * Retrieve the top-k most relevant knowledge base chunks for a query.
 *
 * Scoping is the security boundary: callers MUST pass the owning
 * `userId` (and, when available, the `chatbotId`) so a user can never
 * see another user's knowledge base. `chatbotId` is optional — when
 * omitted we consider chunks from all of the user's documents.
 */
export interface RetrieveOptions {
    userId: string;
    chatbotId?: string | null;
    query: string;
    k?: number;
    minScore?: number;
    apiKey?: string;
}

export async function retrieveContext(opts: RetrieveOptions): Promise<ScoredChunk[]> {
    const { userId, chatbotId, query, k = 4, minScore = 0.2, apiKey } = opts;
    if (!query.trim() || !userId) return [];

    const queryVec = await embedQuery(query, apiKey);
    if (queryVec.length === 0) return [];

    const rows = await db.knowledgeBaseChunk.findMany({
        where: {
            userId,
            ...(chatbotId ? { OR: [{ chatbotId }, { chatbotId: null }] } : {}),
        },
        select: {
            id: true,
            documentId: true,
            chunkIndex: true,
            content: true,
            embedding: true,
        },
    });

    if (rows.length === 0) return [];

    const candidates: StoredChunk[] = rows.map((r) => ({
        id: r.id,
        documentId: r.documentId,
        chunkIndex: r.chunkIndex,
        content: r.content,
        embedding: r.embedding,
    }));

    return topKByCosine(queryVec, candidates, k, minScore);
}

/**
 * Format retrieved chunks into a block of system-prompt context.
 * Returns an empty string when nothing is retrieved so the caller can
 * safely concatenate without conditionals.
 */
export function buildContextPrompt(chunks: ScoredChunk[]): string {
    if (chunks.length === 0) return "";

    const body = chunks
        .map((c, i) => `[Source ${i + 1}]\n${c.content}`)
        .join("\n\n---\n\n");

    return [
        "You have access to the following business knowledge. When the user's question",
        "is answerable from this context, base your answer on it and do not invent facts.",
        "If the answer is not in the context, say so honestly.",
        "",
        "=== KNOWLEDGE CONTEXT START ===",
        body,
        "=== KNOWLEDGE CONTEXT END ===",
    ].join("\n");
}
