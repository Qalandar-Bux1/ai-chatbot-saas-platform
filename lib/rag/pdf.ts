/**
 * Safe PDF text extraction wrapper.
 *
 * `pdf-parse` has quirks (a debug mode that tries to read a test file
 * at import time, and a default export that isn't typed as a function
 * in every setup). We import it lazily and normalise the interface so
 * our API routes don't have to care.
 */

const MAX_PDF_BYTES = 25 * 1024 * 1024;

export interface ExtractedPdf {
    text: string;
    pages: number;
    charCount: number;
}

export async function extractPdf(buffer: Buffer): Promise<ExtractedPdf> {
    if (buffer.length === 0) {
        throw new Error("Uploaded PDF is empty.");
    }
    if (buffer.length > MAX_PDF_BYTES) {
        throw new Error(`PDF exceeds ${MAX_PDF_BYTES / (1024 * 1024)}MB limit.`);
    }

    // Lazy require so Next.js doesn't bundle this into the client and
    // so `pdf-parse`'s debug side-effects only run when we actually
    // need it at request time.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("pdf-parse");
    const pdfParse: (data: Buffer) => Promise<{ text: string; numpages: number }> =
        typeof mod === "function" ? mod : mod.default;

    const result = await pdfParse(buffer);
    const text = (result.text ?? "").trim();

    if (!text) {
        throw new Error("Could not extract any text from the PDF (is it a scanned image?).");
    }

    return {
        text,
        pages: result.numpages ?? 0,
        charCount: text.length,
    };
}
