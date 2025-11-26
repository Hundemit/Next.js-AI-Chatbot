import { join } from "path";

/**
 * Konfiguration für das RAG-System
 */
export const RAG_CONFIG = {
  knowledgeBasePath: join(process.cwd(), "src", "data", "knowledge-base"),
  supportedFormats: [".pdf", ".docx", ".txt", ".md", ".json", ".csv"],
  chunkTokens: 256, // 512 tokens per chunk
  chunkOverlapTokens: 32,
  topK: 5,
  minSimilarity: 0.3, // cosine similarity threshold (0.0-1.0, niedriger = mehr Ergebnisse)
  cachePath: join(process.cwd(), ".next", "cache", "rag-index.json"),
  embeddingBatchSize: 16,
  maxFileSizeMB: 50,
  enableOCR: false, // Phase 2
  piiRedaction: false, // Phase 2
  vectorStore: "file" as const, // 'file' | 'faiss' | 'sqlite' (Phase 2)
} as const;
