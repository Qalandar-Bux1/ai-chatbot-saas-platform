import OpenAI from "openai";

/**
 * Centralised OpenAI embeddings helper.
 *
 * All knowledge base ingestion paths (PDF, raw text) and the retriever
 * go through these helpers so we only have one place to change the
 * model, batching logic, or provider.
 */

/** Default embedding model. Configurable via env for easy upgrades. */
export const EMBEDDING_MODEL = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

/**
 * OpenAI recommends batching up to 2048 inputs per call for
 * `text-embedding-3-*`; we stay well below that for safety.
 */
const EMBEDDING_BATCH_SIZE = 96;

function getClient(apiKey?: string): OpenAI {
    const key = apiKey ?? process.env.OPENAI_API_KEY;
    if (!key) {
        throw new Error("OpenAI API key missing; set OPENAI_API_KEY or pass a per-user key.");
    }
    return new OpenAI({ apiKey: key });
}

/** Embed a single string. Small convenience wrapper used by the retriever. */
export async function embedQuery(text: string, apiKey?: string): Promise<number[]> {
    const client = getClient(apiKey);
    const clean = text.replace(/\n/g, " ").trim();
    if (!clean) return [];

    const res = await client.embeddings.create({
        model: EMBEDDING_MODEL,
        input: clean,
    });
    return res.data[0].embedding;
}

/**
 * Embed many chunks. We batch to stay under token / request limits and
 * to minimise round-trips when ingesting large PDFs.
 */
export async function embedBatch(texts: string[], apiKey?: string): Promise<number[][]> {
    if (texts.length === 0) return [];
    const client = getClient(apiKey);

    const results: number[][] = new Array(texts.length);

    for (let i = 0; i < texts.length; i += EMBEDDING_BATCH_SIZE) {
        const batch = texts.slice(i, i + EMBEDDING_BATCH_SIZE).map((t) => t.replace(/\n/g, " "));
        const res = await client.embeddings.create({
            model: EMBEDDING_MODEL,
            input: batch,
        });
        res.data.forEach((item, idx) => {
            results[i + idx] = item.embedding;
        });
    }

    return results;
}
