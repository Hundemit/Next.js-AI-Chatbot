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

/**
 * File-based Vector Store Implementierung
 */
export class FileVectorStore implements IVectorStore {
  private index: VectorStoreIndex | null = null;
  private indexPath: string;

  constructor(cachePath: string = RAG_CONFIG.cachePath) {
    this.indexPath = cachePath;
  }

  /**
   * Berechnet Cosine Similarity zwischen zwei Vektoren
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
   * Lädt den Index aus der Datei
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
      console.warn("Fehler beim Laden des Index:", error);
      return null;
    }
  }

  /**
   * Speichert den Index in die Datei
   */
  async saveIndex(index: VectorStoreIndex): Promise<void> {
    try {
      // Stelle sicher, dass das Verzeichnis existiert
      const dir = dirname(this.indexPath);
      if (!existsSync(dir)) {
        await mkdir(dir, { recursive: true });
      }

      await writeFile(this.indexPath, JSON.stringify(index, null, 2), "utf-8");
      this.index = index;
    } catch (error) {
      console.error("Fehler beim Speichern des Index:", error);
      throw error;
    }
  }

  /**
   * Initialisiert einen neuen Index
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
   * Speichert einen Chunk im Vector Store
   */
  async addChunk(chunk: Chunk): Promise<void> {
    await this.addChunks([chunk]);
  }

  /**
   * Speichert mehrere Chunks im Batch
   */
  async addChunks(chunks: Chunk[]): Promise<void> {
    let index = await this.loadIndex();

    if (!index) {
      index = this.createNewIndex();
    }

    // Füge Chunks hinzu
    for (const chunk of chunks) {
      // Entferne alten Chunk mit gleicher ID falls vorhanden
      index.chunks = index.chunks.filter((c) => c.id !== chunk.id);
      index.chunks.push(chunk);

      // Aktualisiere File-Index
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
   * Sucht ähnliche Chunks basierend auf Embedding
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

    // Berechne Similarity für alle Chunks mit Embeddings
    const allSimilarities: Array<{ chunk: Chunk; score: number }> = [];
    
    for (const chunk of index.chunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) {
        continue;
      }

      // Prüfe Dimensionen
      if (queryEmbedding.length !== chunk.embedding.length) {
        console.warn(
          `⚠️ Dimension-Mismatch: Query=${queryEmbedding.length}, Chunk=${chunk.embedding.length} für ${chunk.source}`,
        );
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);
      allSimilarities.push({ chunk, score: similarity });
    }
    
    // Log alle Similarities für Debugging
    if (allSimilarities.length > 0) {
      const sorted = [...allSimilarities].sort((a, b) => b.score - a.score);
      console.log(
        `🔢 Similarity-Scores (Top 5):`,
        sorted.slice(0, 5).map((s) => ({
          source: s.chunk.source,
          score: s.score.toFixed(4),
        })),
      );
    }

    const minSimilarity = options.minSimilarity ?? RAG_CONFIG.minSimilarity;
    
    // Filtere nach minSimilarity
    for (const item of allSimilarities) {
      if (item.score >= minSimilarity) {
        results.push(item);
      }
    }

    // Sortiere nach Score (höchste zuerst)
    results.sort((a, b) => b.score - a.score);

    // Return Top-K
    return results.slice(0, options.topK);
  }

  /**
   * Löscht alle Chunks einer Datei
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

    // Entferne Chunks
    index.chunks = index.chunks.filter(
      (chunk) => !fileEntry.chunkIds.includes(chunk.id),
    );

    // Entferne File-Entry
    delete index.fileIndex[filePath];

    index.updatedAt = Date.now();
    await this.saveIndex(index);
  }

  /**
   * Prüft ob eine Datei bereits indiziert ist und ob sie sich geändert hat
   */
  getFileInfo(filePath: string): FileIndexEntry | null {
    if (!this.index) {
      return null;
    }

    return this.index.fileIndex[filePath] || null;
  }
}

