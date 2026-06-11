import type {
  Chunk,
  ChunkDiagnostic,
  IndexDiagnostic,
  RetrievalDiagnostic,
  SearchResult,
  VectorStoreIndex,
} from "./types";

const PREVIEW_LENGTH = 180;

export function createChunkDiagnostic(chunk: Chunk): ChunkDiagnostic {
  const normalizedText = chunk.text.replace(/\s+/g, " ").trim();
  const preview =
    normalizedText.length > PREVIEW_LENGTH
      ? `${normalizedText.slice(0, PREVIEW_LENGTH)}...`
      : normalizedText;

  return {
    id: chunk.id,
    source: chunk.source,
    chunkIndex: chunk.chunkIndex,
    totalChunks: chunk.metadata.totalChunks,
    fileType: chunk.metadata.fileType,
    filePath: chunk.metadata.filePath,
    fileHash: chunk.metadata.fileHash,
    modifiedAt: chunk.metadata.mtime,
    embeddingDimensions: chunk.embedding?.length ?? 0,
    characterCount: chunk.text.length,
    preview,
  };
}

export function createIndexDiagnostic(
  index: VectorStoreIndex | null,
): IndexDiagnostic {
  if (!index) {
    return {
      indexed: false,
      version: null,
      createdAt: null,
      updatedAt: null,
      fileCount: 0,
      chunkCount: 0,
      chunksWithEmbeddings: 0,
      files: [],
      chunks: [],
    };
  }

  return {
    indexed: true,
    version: index.version,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
    fileCount: Object.keys(index.fileIndex).length,
    chunkCount: index.chunks.length,
    chunksWithEmbeddings: index.chunks.filter(
      (chunk) => (chunk.embedding?.length ?? 0) > 0,
    ).length,
    files: Object.values(index.fileIndex)
      .map((file) => ({
        filePath: file.filePath,
        fileHash: file.fileHash,
        modifiedAt: file.mtime,
        chunkCount: file.chunkIds.length,
      }))
      .sort((a, b) => a.filePath.localeCompare(b.filePath)),
    chunks: index.chunks
      .map(createChunkDiagnostic)
      .sort(
        (a, b) =>
          a.filePath.localeCompare(b.filePath) ||
          a.chunkIndex - b.chunkIndex,
      ),
  };
}

export function createIndexDiagnosticSummary(index: IndexDiagnostic) {
  return {
    indexed: index.indexed,
    version: index.version,
    createdAt: index.createdAt,
    updatedAt: index.updatedAt,
    fileCount: index.fileCount,
    chunkCount: index.chunkCount,
    chunksWithEmbeddings: index.chunksWithEmbeddings,
  };
}

export function createRetrievalDiagnostic({
  results,
  usedChunkIds,
}: {
  results: SearchResult[];
  usedChunkIds: string[];
}): RetrievalDiagnostic {
  const usedIds = new Set(usedChunkIds);
  const candidates = results.map(({ chunk, score }) => ({
    ...createChunkDiagnostic(chunk),
    score,
    used: usedIds.has(chunk.id),
  }));

  return {
    candidates,
    usedChunks: candidates.filter((chunk) => chunk.used),
  };
}
