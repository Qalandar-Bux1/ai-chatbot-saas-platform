/**
 * Cosine similarity + top-k retrieval.
 *
 * Because we store embeddings as Float[] (no pgvector dependency), the
 * similarity math runs in application code. This is fast enough for
 * per-user knowledge bases with up to a few thousand chunks; beyond
 * that, swap this module out for a vector DB without changing the
 * callers.
 */

import type { ScoredChunk } from "./types";

export function cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length || a.length === 0) return 0;

    let dot = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        magA += a[i] * a[i];
        magB += b[i] * b[i];
    }

    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
}

export interface StoredChunk {
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    embedding: number[];
}

/**
 * Rank `candidates` against `queryVec` and return the top `k` most
 * similar chunks. Keeps only chunks whose score beats `minScore` so we
 * don't dilute the prompt with unrelated context.
 */
export function topKByCosine(
    queryVec: number[],
    candidates: StoredChunk[],
    k = 5,
    minScore = 0.2,
): ScoredChunk[] {
    if (queryVec.length === 0 || candidates.length === 0) return [];

    const scored: ScoredChunk[] = candidates.map((c) => ({
        id: c.id,
        documentId: c.documentId,
        chunkIndex: c.chunkIndex,
        content: c.content,
        score: cosineSimilarity(queryVec, c.embedding),
    }));

    return scored
        .filter((c) => c.score >= minScore)
        .sort((a, b) => b.score - a.score)
        .slice(0, k);
}
