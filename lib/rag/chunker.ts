import type { ChunkerOptions, RawChunk } from "./types";

/**
 * Split a long string into retrieval-friendly chunks.
 *
 * We aim for 500–1000 character chunks (per spec) and try to break on
 * paragraph / sentence boundaries so each chunk reads naturally. A small
 * character overlap between adjacent chunks preserves context across
 * boundaries for the retriever.
 */
export function chunkText(input: string, opts: ChunkerOptions = {}): RawChunk[] {
    const {
        targetSize = 800,
        minSize = 250,
        maxSize = 1000,
        overlap = 100,
    } = opts;

    const text = normalize(input);
    if (!text) return [];

    const chunks: string[] = [];
    let cursor = 0;

    while (cursor < text.length) {
        const remaining = text.length - cursor;

        if (remaining <= maxSize) {
            chunks.push(text.slice(cursor).trim());
            break;
        }

        const windowEnd = Math.min(cursor + maxSize, text.length);
        const softTarget = Math.min(cursor + targetSize, text.length);
        const breakPoint = findBreakPoint(text, cursor + minSize, softTarget, windowEnd);

        chunks.push(text.slice(cursor, breakPoint).trim());

        cursor = Math.max(breakPoint - overlap, cursor + 1);
    }

    return chunks
        .filter((c) => c.length > 0)
        .map((content, index) => ({ index, content }));
}

/** Collapse excessive whitespace so chunk size is meaningful. */
function normalize(text: string): string {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/[\t\f\v]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

/**
 * Prefer breaking at a paragraph / sentence boundary near the target
 * size. Fall back to a whitespace boundary, and finally a hard cut.
 */
function findBreakPoint(text: string, min: number, target: number, hardMax: number): number {
    const searchStart = Math.max(min, 0);
    const searchEnd = Math.min(hardMax, text.length);
    if (searchStart >= searchEnd) return searchEnd;

    const slice = text.slice(searchStart, searchEnd);

    const paragraph = slice.lastIndexOf("\n\n", target - searchStart);
    if (paragraph > 0) return searchStart + paragraph + 2;

    const sentence = lastIndexOfAny(slice, [". ", "! ", "? ", ".\n", "!\n", "?\n"], target - searchStart);
    if (sentence > 0) return searchStart + sentence + 2;

    const space = slice.lastIndexOf(" ", target - searchStart);
    if (space > 0) return searchStart + space + 1;

    return Math.min(target, hardMax);
}

function lastIndexOfAny(haystack: string, needles: string[], fromIndex: number): number {
    let best = -1;
    for (const n of needles) {
        const idx = haystack.lastIndexOf(n, fromIndex);
        if (idx > best) best = idx;
    }
    return best;
}
