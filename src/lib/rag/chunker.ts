import { encodingForModel } from "js-tiktoken";

import { RAG_CONFIG } from "./config";
import type { Chunk } from "./types";

/**
 * Token-based chunking for various file types.
 */

// Use a common model for token counting (can be adjusted)
const ENCODING = encodingForModel("gpt-4");

/**
 * Splits text into token-based chunks.
 */
export function chunkText(
  text: string,
  source: string,
  metadata: {
    fileType: string;
    filePath: string;
    fileHash: string;
    mtime: number;
  },
): Chunk[] {
  const chunks: Chunk[] = [];
  const chunkTokens = RAG_CONFIG.chunkTokens;
  const overlapTokens = RAG_CONFIG.chunkOverlapTokens;

  // Tokenize den gesamten Text
  const tokens = ENCODING.encode(text);

  if (tokens.length <= chunkTokens) {
    // Text passt in einen Chunk
    chunks.push({
      id: `${source}-0`,
      text,
      source,
      chunkIndex: 0,
      metadata: {
        ...metadata,
        totalChunks: 1,
      },
    });
    return chunks;
  }

  // Smart chunking with overlap
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < tokens.length) {
    const endIndex = Math.min(startIndex + chunkTokens, tokens.length);
    const chunkTokenSlice = tokens.slice(startIndex, endIndex);

    // Decode back to text
    const chunkText = ENCODING.decode(chunkTokenSlice);

    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: chunkText,
      source,
      chunkIndex,
      metadata: {
        ...metadata,
        totalChunks: Math.ceil(tokens.length / chunkTokens),
      },
    });

    // Next chunk with overlap
    startIndex = endIndex - overlapTokens;
    chunkIndex++;

    // Prevent infinite loop
    if (startIndex >= tokens.length - overlapTokens) {
      break;
    }
  }

  return chunks;
}

/**
 * Smart chunking for code files (preserves context).
 */
export function chunkCode(
  text: string,
  source: string,
  metadata: {
    fileType: string;
    filePath: string;
    fileHash: string;
    mtime: number;
  },
): Chunk[] {
  // For code: try to chunk at line breaks
  const lines = text.split("\n");
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;
  let chunkIndex = 0;

  const chunkTokens = RAG_CONFIG.chunkTokens;
  const overlapTokens = RAG_CONFIG.chunkOverlapTokens;

  for (const line of lines) {
    const lineTokens = ENCODING.encode(line).length;

    if (currentTokens + lineTokens > chunkTokens && currentChunk.length > 0) {
      // Save current chunk
      chunks.push({
        id: `${source}-${chunkIndex}`,
        text: currentChunk.join("\n"),
        source,
        chunkIndex,
        metadata: {
          ...metadata,
          totalChunks: 0, // Will be updated later
        },
      });

      // Overlap: keep last portion of the chunk
      const overlapLines = Math.floor(
        (overlapTokens / chunkTokens) * currentChunk.length,
      );
      currentChunk = currentChunk.slice(-overlapLines);
      currentTokens = ENCODING.encode(currentChunk.join("\n")).length;
      chunkIndex++;
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  // Last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: currentChunk.join("\n"),
      source,
      chunkIndex,
      metadata: {
        ...metadata,
        totalChunks: 0, // Will be set below once the final count is known
      },
    });
  }

  // Set totalChunks for all chunks now that the final count is known
  return chunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      totalChunks: chunks.length,
    },
  }));
}

/**
 * Selects the appropriate chunking strategy based on file type.
 */
export function chunkByFileType(
  text: string,
  source: string,
  metadata: {
    fileType: string;
    filePath: string;
    fileHash: string;
    mtime: number;
  },
): Chunk[] {
  const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go"];

  if (codeExtensions.some((ext) => metadata.filePath.endsWith(ext))) {
    return chunkCode(text, source, metadata);
  }

  return chunkText(text, source, metadata);
}

