/**
 * TypeScript Interfaces für das RAG-System
 */

export interface Chunk {
  id: string;
  text: string;
  embedding?: number[];
  source: string; // Dateiname
  chunkIndex: number;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  fileType: string;
  filePath: string;
  fileHash: string; // SHA256 Hash
  mtime: number; // Modification time
  totalChunks: number;
}

export interface SearchResult {
  chunk: Chunk;
  score: number; // Cosine similarity score
}

export interface RelevantContext {
  context: string; // Kombinierter Kontext-Text
  sources: SourceInfo[]; // Source-Attribution
}

export interface SourceInfo {
  file: string;
  chunkIndex: number;
  score: number;
}

export interface VectorStoreIndex {
  version: string;
  chunks: Chunk[];
  fileIndex: Record<string, FileIndexEntry>; // Dateiname -> Metadaten
  createdAt: number;
  updatedAt: number;
}

export interface FileIndexEntry {
  filePath: string;
  fileHash: string;
  mtime: number;
  chunkIds: string[]; // IDs der Chunks dieser Datei
}

export interface IVectorStore {
  /**
   * Speichert einen Chunk im Vector Store
   */
  addChunk(chunk: Chunk): Promise<void>;

  /**
   * Speichert mehrere Chunks im Batch
   */
  addChunks(chunks: Chunk[]): Promise<void>;

  /**
   * Sucht ähnliche Chunks basierend auf Embedding
   */
  search(
    queryEmbedding: number[],
    options: { topK: number; minSimilarity?: number },
  ): Promise<SearchResult[]>;

  /**
   * Löscht alle Chunks einer Datei
   */
  removeFile(filePath: string): Promise<void>;

  /**
   * Prüft ob eine Datei bereits indiziert ist und ob sie sich geändert hat
   */
  getFileInfo(filePath: string): FileIndexEntry | null;

  /**
   * Lädt den gesamten Index
   */
  loadIndex(): Promise<VectorStoreIndex | null>;

  /**
   * Speichert den Index
   */
  saveIndex(index: VectorStoreIndex): Promise<void>;
}

