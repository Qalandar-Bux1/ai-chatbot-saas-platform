import { db } from "@/lib/db";
import { chunkText } from "./chunker";
import { embedBatch } from "./embeddings";
import type { KnowledgeSource } from "./types";

/**
 * Ingest raw text (already extracted from PDF, or user-provided FAQ
 * text) into the knowledge base:
 *   1. chunk the text
 *   2. embed every chunk (batched)
 *   3. persist the document + chunks in a single transaction
 *
 * Returns the created document id and chunk count so callers can tell
 * the user what was ingested.
 */
export interface IngestOptions {
    userId: string;
    chatbotId?: string | null;
    name: string;
    source: KnowledgeSource;
    content: string;
    blobUrl?: string | null;
    apiKey?: string;
}

export interface IngestResult {
    documentId: string;
    chunkCount: number;
    charCount: number;
}

export async function ingestText(opts: IngestOptions): Promise<IngestResult> {
    const { userId, chatbotId, name, source, content, blobUrl, apiKey } = opts;

    const trimmed = content.trim();
    if (!trimmed) {
        throw new Error("Nothing to ingest: the provided content is empty.");
    }

    const rawChunks = chunkText(trimmed);
    if (rawChunks.length === 0) {
        throw new Error("Content was too short to produce any chunks.");
    }

    const embeddings = await embedBatch(
        rawChunks.map((c) => c.content),
        apiKey,
    );

    const document = await db.$transaction(async (tx) => {
        const doc = await tx.knowledgeBaseDocument.create({
            data: {
                userId,
                chatbotId: chatbotId ?? null,
                name,
                source,
                blobUrl: blobUrl ?? null,
                charCount: trimmed.length,
            },
        });

        await tx.knowledgeBaseChunk.createMany({
            data: rawChunks.map((c, i) => ({
                documentId: doc.id,
                userId,
                chatbotId: chatbotId ?? null,
                chunkIndex: c.index,
                content: c.content,
                embedding: embeddings[i] ?? [],
            })),
        });

        return doc;
    });

    return {
        documentId: document.id,
        chunkCount: rawChunks.length,
        charCount: trimmed.length,
    };
}
