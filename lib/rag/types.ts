/**
 * Shared types for the Knowledge Base / RAG pipeline.
 *
 * Kept in a dedicated file so client components (e.g. the Knowledge
 * Base dashboard page) can import types without pulling in server-only
 * modules like `openai` or `pdf-parse`.
 */

/** Sources we currently support when ingesting into the knowledge base. */
export type KnowledgeSource = "pdf" | "text";

/** A single chunk produced by the chunker, before it has been embedded. */
export interface RawChunk {
    index: number;
    content: string;
}

/** A chunk with its embedding vector attached, ready to be persisted. */
export interface EmbeddedChunk extends RawChunk {
    embedding: number[];
}

/** A chunk retrieved from the database together with its similarity score. */
export interface ScoredChunk {
    id: string;
    documentId: string;
    chunkIndex: number;
    content: string;
    score: number;
}

/** Options that tune the chunker. */
export interface ChunkerOptions {
    /** Target chunk size in characters. Default: 800. */
    targetSize?: number;
    /** Minimum chunk size we are willing to emit (avoids tiny tail chunks). */
    minSize?: number;
    /** Maximum chunk size — a hard ceiling, per the spec (500–1000 chars). */
    maxSize?: number;
    /** How many characters adjacent chunks should share. Default: 100. */
    overlap?: number;
}
