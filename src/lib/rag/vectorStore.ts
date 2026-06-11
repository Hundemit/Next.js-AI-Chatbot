import { existsSync } from "fs";
import { readFile, writeFile, mkdir } from "fs/promises";
import { dirname } from "path";

import { RAG_CONFIG } from "./config";
import type {
  IVectorStore,
  Chunk,
  SearchResult,
  VectorStoreIndex,
  FileIndexEntry,
} from "./types";
import { logger } from "@/lib/logger";

/**
 * File-based Vector Store implementation.
 */
export class FileVectorStore implements IVectorStore {
  private index: VectorStoreIndex | null = null;
  private indexPath: string;

  constructor(cachePath: string = RAG_CONFIG.cachePath) {
    this.indexPath = cachePath;
  }

  /**
   * Computes cosine similarity between two vectors.
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Loads the index from disk.
   */
  async loadIndex(): Promise<VectorStoreIndex | null> {
    if (this.index) {
      return this.index;
    }

    if (!existsSync(this.indexPath)) {
      return null;
    }

    try {
      const content = await readFile(this.indexPath, "utf-8");
      this.index = JSON.parse(content) as VectorStoreIndex;
      return this.index;
    } catch (error) {
      logger.warn("Error loading index:", error);
      return null;
    }
  }

  /**
   * Saves the index to disk.
   */
  async saveIndex(index: VectorStoreIndex): Promise<void> {
    try {
      // Ensure the directory exists
      const dir = dirname(this.indexPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
      this.index = index;
    } catch (error) {
      logger.error("Error saving index:", error);
      throw error;
    }
  }

  /**
   * Creates a new empty index.
   */
  private createNewIndex(): VectorStoreIndex {
    return {
      version: "1.0.0",
      chunks: [],
      fileIndex: {},
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }

  /**
   * Stores a single chunk.
   */
  async addChunk(chunk: Chunk): Promise<void> {
    await this.addChunks([chunk]);
  }

  /**
   * Stores multiple chunks in batch.
   */
  async addChunks(chunks: Chunk[]): Promise<void> {
    let index = await this.loadIndex();

    if (!index) {
      index = this.createNewIndex();
    }

    // Füge Chunks hinzu
    for (const chunk of chunks) {
      // Remove existing chunk with the same ID
      index.chunks = index.chunks.filter((c) => c.id !== chunk.id);
      index.chunks.push(chunk);

      // Update file index
      const filePath = chunk.metadata.filePath;
      if (!index.fileIndex[filePath]) {
        index.fileIndex[filePath] = {
          filePath,
          fileHash: chunk.metadata.fileHash,
          mtime: chunk.metadata.mtime,
          chunkIds: [],
        };
      }

      if (!index.fileIndex[filePath].chunkIds.includes(chunk.id)) {
        index.fileIndex[filePath].chunkIds.push(chunk.id);
      }
    }

    index.updatedAt = Date.now();
    await this.saveIndex(index);
  }

  /**
   * Searches for similar chunks based on an embedding vector.
   */
  async search(
    queryEmbedding: number[],
    options: { topK: number; minSimilarity?: number },
  ): Promise<SearchResult[]> {
    const index = await this.loadIndex();

    if (!index || index.chunks.length === 0) {
      return [];
    }

    const results: SearchResult[] = [];

    // Compute similarity for all chunks with embeddings
    const allSimilarities: Array<{ chunk: Chunk; score: number }> = [];
    
    for (const chunk of index.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        continue;
      }

      // Check dimensions
      if (queryEmbedding.length !== chunk.embedding.length) {
        logger.debug(
          `Dimension mismatch: Query=${queryEmbedding.length}, Chunk=${chunk.embedding.length} for ${chunk.source}`,
        );
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      allSimilarities.push({ chunk, score: similarity });
    }

    const minSimilarity = options.minSimilarity ?? RAG_CONFIG.minSimilarity;
    
    // Filter by minimum similarity
    for (const item of allSimilarities) {
      if (item.score >= minSimilarity) {
        results.push(item);
      }
    }

    // Sort by score (highest first)
    results.sort((a, b) => b.score - a.score);

    // Return Top-K
    return results.slice(0, options.topK);
  }

  /**
   * Removes all chunks belonging to a file.
   */
  async removeFile(filePath: string): Promise<void> {
    const index = await this.loadIndex();

    if (!index) {
      return;
    }

    const fileEntry = index.fileIndex[filePath];
    if (!fileEntry) {
      return;
    }

    // Remove chunks
    index.chunks = index.chunks.filter(
      (chunk) => !fileEntry.chunkIds.includes(chunk.id),
    );

    // Remove file entry
    delete index.fileIndex[filePath];

    index.updatedAt = Date.now();
    await this.saveIndex(index);
  }

  /**
   * Checks whether a file is indexed and whether it has changed.
   */
  getFileInfo(filePath: string): FileIndexEntry | null {
    if (!this.index) {
      return null;
    }

    return this.index.fileIndex[filePath] || null;
  }
}
