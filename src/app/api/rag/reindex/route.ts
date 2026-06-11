import { indexKnowledgeBase } from "@/lib/rag/index";
import {
  checkRateLimit,
  getClientIp,
  REINDEX_RATE_LIMIT,
} from "@/lib/rateLimit";

// Allow responses up to 30 seconds
export const maxDuration = 30;

/**
 * POST /api/rag/reindex
 * Manual re-indexing of the knowledge base. Protected by a secret token.
 */
export async function POST(req: Request) {
  try {
    // Auth check — require REINDEX_SECRET when set
    const secret = process.env.REINDEX_SECRET;
    if (secret) {
      const provided = req.headers.get("x-reindex-secret");
      if (provided !== secret) {
        return new Response(
          JSON.stringify({ success: false, error: "Unauthorized" }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        );
      }
    }

    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(clientIp, REINDEX_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ success: false, error: "Too many requests" }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(
              Math.ceil((rateLimitResult.retryAfterMs ?? 0) / 1000),
            ),
          },
        },
      );
    }

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
    console.error("Error during re-indexing:", error);
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
 * Index status
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
    console.error("Error fetching index status:", error);
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

