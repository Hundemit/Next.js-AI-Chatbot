import { indexKnowledgeBase } from "@/lib/rag/index";

// Allow responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/rag/reindex
 * Manuelles Re-Indexing der Knowledge Base
 */
export async function POST(req: Request) {
  try {
    const { force } = await req.json().catch(() => ({}));

    const result = await indexKnowledgeBase(force === true);

    return new Response(
      JSON.stringify({
        success: true,
        ...result,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Fehler beim Re-Indexing:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

/**
 * GET /api/rag/reindex
 * Status des Index
 */
export async function GET() {
  try {
    const { FileVectorStore } = await import("@/lib/rag/vectorStore");
    const vectorStore = new FileVectorStore();
    const index = await vectorStore.loadIndex();

    if (!index) {
      return new Response(
        JSON.stringify({
          indexed: false,
          chunks: 0,
          files: 0,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        indexed: true,
        chunks: index.chunks.length,
        files: Object.keys(index.fileIndex).length,
        createdAt: index.createdAt,
        updatedAt: index.updatedAt,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Fehler beim Abrufen des Index-Status:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}

