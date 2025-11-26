import { encodingForModel } from "js-tiktoken";

import { RAG_CONFIG } from "./config";
import type { Chunk } from "./types";

/**
 * Token-basiertes Chunking für verschiedene Dateitypen
 */

// Verwende ein gängiges Modell für Token-Zählung (kann angepasst werden)
const ENCODING = encodingForModel("gpt-4");

/**
 * Teilt Text in Token-basierte Chunks auf
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

  // Intelligentes Chunking mit Overlap
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < tokens.length) {
    const endIndex = Math.min(startIndex + chunkTokens, tokens.length);
    const chunkTokens_slice = tokens.slice(startIndex, endIndex);

    // Decode zurück zu Text
    const chunkText = ENCODING.decode(chunkTokens_slice);

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

    // Nächster Chunk mit Overlap
    startIndex = endIndex - overlapTokens;
    chunkIndex++;

    // Verhindere Endlosschleife
    if (startIndex >= tokens.length - overlapTokens) {
      break;
    }
  }

  return chunks;
}

/**
 * Intelligentes Chunking für Code-Dateien (behält Kontext)
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
  // Für Code: Versuche an Zeilenumbrüchen zu chunken
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
      // Speichere aktuellen Chunk
      chunks.push({
        id: `${source}-${chunkIndex}`,
        text: currentChunk.join("\n"),
        source,
        chunkIndex,
        metadata: {
          ...metadata,
          totalChunks: 0, // Wird später aktualisiert
        },
      });

      // Overlap: Behalte letzten Teil des Chunks
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

  // Letzter Chunk
  if (currentChunk.length > 0) {
    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: currentChunk.join("\n"),
      source,
      chunkIndex,
      metadata: {
        ...metadata,
        totalChunks: chunks.length + 1,
      },
    });
  }

  // Aktualisiere totalChunks für alle Chunks
  return chunks.map((chunk) => ({
    ...chunk,
    metadata: {
      ...chunk.metadata,
      totalChunks: chunks.length,
    },
  }));
}

/**
 * Wählt die passende Chunking-Strategie basierend auf Dateityp
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

