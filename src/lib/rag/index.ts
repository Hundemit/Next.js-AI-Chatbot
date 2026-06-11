import { createHash } from "crypto";
import { readdir, stat } from "fs/promises";
import { encodingForModel } from "js-tiktoken";
import { extname, join, relative } from "path";

import { chunkByFileType } from "./chunker";
import { RAG_CONFIG } from "./config";
import { parseFile } from "./parsers";
import type { Chunk, RelevantContext, SourceInfo } from "./types";
import { FileVectorStore } from "./vectorStore";
import { logger } from "@/lib/logger";

/**
 * Main RAG logic for knowledge base management.
 */

const ENCODING = encodingForModel("gpt-4");

export const EMBEDDING_MODEL = "text-embedding-3-small";
export const MAX_CONTEXT_TOKENS = 2000;

// Module-level singleton so the in-memory index cache survives across
// requests within the same serverless invocation.
const vectorStore = new FileVectorStore();

/**
 * Computes the SHA-256 hash of a file.
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const { readFile } = await import("fs/promises");
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Generates embeddings for an array of texts.
 *
 * Uses a single API call with array input when possible (the OpenRouter
 * embeddings endpoint accepts `input: string[]`).  Falls back to
 * sequential calls only when the batch request fails.
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  try {
    // Try batch request first (single API call)
    const response = await fetch(
      "https://openrouter.ai/api/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: texts,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.statusText}`);
    }

    const data = await response.json();

    // Sort by index to guarantee correct ordering
    const sorted = [...data.data].sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index,
    );

    return sorted.map(
      (item: { embedding: number[] }) => item.embedding || [],
    );
  } catch (batchError) {
    // Fallback: sequential calls
    logger.debug(
      "Batch embedding failed, falling back to sequential:",
      batchError,
    );

    const embeddings: number[][] = [];
    for (const text of texts) {
      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/embeddings",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: EMBEDDING_MODEL,
              input: text,
            }),
          },
        );

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        embeddings.push(data.data[0]?.embedding || []);
      } catch (error) {
        logger.error("Embedding generation failed:", error);
        embeddings.push([]);
      }
    }

    return embeddings;
  }
}

/**
 * Generates a single embedding for a text string.
 */
async function getEmbedding(text: string): Promise<number[]> {
  const embeddings = await getEmbeddings([text]);
  return embeddings[0] || [];
}

/**
 * Checks whether a file extension is supported for indexing.
 */
function isSupportedFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return RAG_CONFIG.supportedFormats.includes(
    ext as (typeof RAG_CONFIG.supportedFormats)[number],
  );
}

/**
 * Indexes all files in the knowledge base directory.
 */
export async function indexKnowledgeBase(
  forceReindex: boolean = false,
): Promise<{ indexed: number; skipped: number; errors: number }> {
  const knowledgeBasePath = RAG_CONFIG.knowledgeBasePath;

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const { existsSync } = await import("fs");
    if (!existsSync(knowledgeBasePath)) {
      logger.warn(`Knowledge base folder not found: ${knowledgeBasePath}`);
      return { indexed: 0, skipped: 0, errors: 0 };
    }

    await vectorStore.loadIndex();

    const allEntries = await readdir(knowledgeBasePath, { recursive: true });

    // Filter to supported files only
    const supportedFiles: string[] = [];
    for (const entry of allEntries) {
      const entryPath = join(knowledgeBasePath, entry);
      try {
        const stats = await stat(entryPath);
        if (
          stats.isFile() &&
          isSupportedFile(entry) &&
          !entry.startsWith(".")
        ) {
          supportedFiles.push(entry);
        }
      } catch {
        continue;
      }
    }

    logger.debug(`Found ${supportedFiles.length} supported files to index`);

    // Collect chunks for batch embedding
    const chunksToEmbed: { chunk: Chunk; text: string }[] = [];

    for (const file of supportedFiles) {
      const filePath = join(knowledgeBasePath, file);
      const relativePath = relative(knowledgeBasePath, filePath);

      try {
        const stats = await stat(filePath);
        const fileHash = await calculateFileHash(filePath);
        const fileInfo = vectorStore.getFileInfo(relativePath);

        // Skip if file hasn't changed
        if (
          !forceReindex &&
          fileInfo &&
          fileInfo.fileHash === fileHash &&
          fileInfo.mtime === stats.mtimeMs
        ) {
          skipped++;
          continue;
        }

        // Remove old chunks for this file
        await vectorStore.removeFile(relativePath);

        const text = await parseFile(filePath);
        const fileExt = extname(filePath).toLowerCase();
        const chunks = chunkByFileType(text, relativePath, {
          fileType: fileExt as
            | ".pdf"
            | ".docx"
            | ".txt"
            | ".md"
            | ".json"
            | ".csv",
          filePath: relativePath,
          fileHash,
          mtime: stats.mtimeMs,
        });

        for (const chunk of chunks) {
          chunksToEmbed.push({ chunk, text: chunk.text });
        }

        indexed++;
      } catch (error) {
        logger.error(`Error indexing ${file}:`, error);
        errors++;
      }
    }

    // Generate embeddings in batches
    const batchSize = RAG_CONFIG.embeddingBatchSize;
    for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
      const batch = chunksToEmbed.slice(i, i + batchSize);
      const texts = batch.map((b) => b.text);
      const embeddings = await getEmbeddings(texts);

      const chunksWithEmbeddings = batch.map((item, idx) => ({
        ...item.chunk,
        embedding: embeddings[idx] || [],
      }));

      await vectorStore.addChunks(chunksWithEmbeddings);
    }

    logger.info(
      `Indexing complete: ${indexed} indexed, ${skipped} skipped, ${errors} errors`,
    );

    return { indexed, skipped, errors };
  } catch (error) {
    logger.error("Error indexing knowledge base:", error);
    throw error;
  }
}

/**
 * Searches for relevant chunks based on a user query.
 */
export async function searchRelevantChunks(
  query: string,
  topK: number = RAG_CONFIG.topK,
): Promise<Array<{ chunk: Chunk; score: number }>> {
  try {
    const queryEmbedding = await getEmbedding(query);

    if (queryEmbedding.length === 0) {
      logger.warn("Could not generate query embedding");
      return [];
    }

    const index = await vectorStore.loadIndex();
    if (!index || index.chunks.length === 0) {
      // Start background indexing (non-blocking)
      initializeKnowledgeBase().catch((error) => {
        logger.warn("Background indexing failed:", error);
      });
      return [];
    }

    const results = await vectorStore.search(queryEmbedding, {
      topK,
      minSimilarity: RAG_CONFIG.minSimilarity,
    });

    logger.debug(
      `Search: ${results.length} results (minSimilarity: ${RAG_CONFIG.minSimilarity})`,
    );

    return results;
  } catch (error) {
    logger.error("Search error:", error);
    return [];
  }
}

/**
 * Loads relevant context based on a user query.
 */
export async function loadRelevantContext(
  userQuery: string,
): Promise<RelevantContext> {
  try {
    const results = await searchRelevantChunks(userQuery);

    if (results.length === 0) {
      return {
        context: "",
        sources: [],
        results: [],
        usedChunkIds: [],
        tokenCount: 0,
      };
    }

    // Combine chunks into context
    const chunks: string[] = [];
    const sources: SourceInfo[] = [];
    let currentTokens = 0;

    for (const result of results) {
      const chunkTokens = ENCODING.encode(result.chunk.text).length;

      if (currentTokens + chunkTokens > MAX_CONTEXT_TOKENS) {
        break;
      }

      chunks.push(result.chunk.text);
      sources.push({
        file: result.chunk.source,
        chunkIndex: result.chunk.chunkIndex,
        score: result.score,
      });

      currentTokens += chunkTokens;
    }

    // Format context with source attribution
    const contextParts: string[] = [];

    if (chunks.length > 0) {
      contextParts.push("## Verfügbare Informationen:\n");

      chunks.forEach((chunkText, idx) => {
        const source = sources[idx];
        contextParts.push(
          `\n### ${source.file} (Chunk ${
            source.chunkIndex
          }, Relevanz: ${source.score.toFixed(2)})\n\n${chunkText}\n`,
        );
      });
    }

    return {
      context: contextParts.join("\n"),
      sources,
      results,
      usedChunkIds: sources.map(
        (source) => `${source.file}-${source.chunkIndex}`,
      ),
      tokenCount: currentTokens,
    };
  } catch (error) {
    logger.error("Error loading relevant context:", error);
    return {
      context: "",
      sources: [],
      results: [],
      usedChunkIds: [],
      tokenCount: 0,
    };
  }
}

/**
 * Initializes the knowledge base (called on startup).
 * Prevents parallel indexing via a module-level promise guard.
 */
let indexingPromise: Promise<{
  indexed: number;
  skipped: number;
  errors: number;
}> | null = null;
let hasInitializedKnowledgeBase = false;

export async function initializeKnowledgeBase(
  forceReindex: boolean = false,
): Promise<void> {
  if (!forceReindex && hasInitializedKnowledgeBase) {
    return;
  }

  if (indexingPromise) {
    await indexingPromise;
    if (!forceReindex) {
      return;
    }
  }

  indexingPromise = indexKnowledgeBase(forceReindex);
  try {
    await indexingPromise;
    hasInitializedKnowledgeBase = true;
  } finally {
    indexingPromise = null;
  }
}
