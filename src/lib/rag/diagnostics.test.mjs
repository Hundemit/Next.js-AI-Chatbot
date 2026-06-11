import assert from "node:assert/strict";
import test from "node:test";

import {
  createChunkDiagnostic,
  createIndexDiagnostic,
  createIndexDiagnosticSummary,
  createRetrievalDiagnostic,
} from "./diagnostics.ts";

const chunk = {
  id: "guide.md-0",
  text: "A".repeat(240),
  embedding: [0.1, 0.2, 0.3],
  source: "guide.md",
  chunkIndex: 0,
  metadata: {
    fileType: ".md",
    filePath: "guide.md",
    fileHash: "hash",
    mtime: 1_700_000_000_000,
    totalChunks: 2,
  },
};

test("createChunkDiagnostic exposes useful metadata without embedding vectors", () => {
  const diagnostic = createChunkDiagnostic(chunk);

  assert.equal(diagnostic.id, "guide.md-0");
  assert.equal(diagnostic.embeddingDimensions, 3);
  assert.equal(diagnostic.preview.length, 183);
  assert.equal("embedding" in diagnostic, false);
});

test("createIndexDiagnostic summarizes files and chunks", () => {
  const index = {
    version: "1.0.0",
    chunks: [chunk, { ...chunk, id: "guide.md-1", chunkIndex: 1 }],
    fileIndex: {
      "guide.md": {
        filePath: "guide.md",
        fileHash: "hash",
        mtime: 1_700_000_000_000,
        chunkIds: ["guide.md-0", "guide.md-1"],
      },
    },
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_001_000,
  };

  const diagnostic = createIndexDiagnostic(index);

  assert.equal(diagnostic.indexed, true);
  assert.equal(diagnostic.chunkCount, 2);
  assert.equal(diagnostic.fileCount, 1);
  assert.equal(diagnostic.files[0]?.chunkCount, 2);
  assert.equal(diagnostic.chunks[0]?.embeddingDimensions, 3);
});

test("createIndexDiagnosticSummary omits detailed file and chunk lists", () => {
  const summary = createIndexDiagnosticSummary(createIndexDiagnostic(null));

  assert.equal("files" in summary, false);
  assert.equal("chunks" in summary, false);
  assert.equal(summary.indexed, false);
});

test("createRetrievalDiagnostic distinguishes candidates from prompt chunks", () => {
  const diagnostic = createRetrievalDiagnostic({
    results: [
      { chunk, score: 0.91 },
      {
        chunk: { ...chunk, id: "guide.md-1", chunkIndex: 1 },
        score: 0.72,
      },
    ],
    usedChunkIds: ["guide.md-0"],
  });

  assert.equal(diagnostic.candidates.length, 2);
  assert.deepEqual(diagnostic.usedChunks.map((item) => item.id), ["guide.md-0"]);
  assert.equal(diagnostic.candidates[0]?.used, true);
  assert.equal(diagnostic.candidates[1]?.used, false);
});
