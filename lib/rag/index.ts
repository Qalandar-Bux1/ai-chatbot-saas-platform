/**
 * Public barrel for the Knowledge Base / RAG module.
 *
 * Callers should only import from `@/lib/rag` — the internal layout is
 * free to evolve (swap embedding provider, vector DB, chunking strategy)
 * without touching API routes or UI.
 */

export * from "./types";
export { chunkText } from "./chunker";
export { embedQuery, embedBatch, EMBEDDING_MODEL } from "./embeddings";
export { cosineSimilarity, topKByCosine } from "./similarity";
export type { StoredChunk } from "./similarity";
export { extractPdf } from "./pdf";
export type { ExtractedPdf } from "./pdf";
export { retrieveContext, buildContextPrompt } from "./retrieve";
export { ingestText } from "./ingest";
export type { IngestOptions, IngestResult } from "./ingest";
