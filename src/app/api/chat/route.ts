import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { nanoid } from "nanoid";

import {
  extractTextFromMessage,
  getModelRelevantMessages,
} from "@/lib/chatUtils";
import { parseChatRequestBody } from "@/lib/chatRequestValidation";
import { MODELS } from "@/lib/constants";
import {
  loadRelevantContextDetails,
  loadFullContext,
  type RelevantContextDetails,
} from "@/lib/loadDocuments";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  CHAT_RATE_LIMIT,
} from "@/lib/rateLimit";
import { initializeKnowledgeBase, EMBEDDING_MODEL, MAX_CONTEXT_TOKENS } from "@/lib/rag/index";
import { RAG_CONFIG } from "@/lib/rag/config";
import {
  createRetrievalDiagnostic,
  createIndexDiagnostic,
  createIndexDiagnosticSummary,
} from "@/lib/rag/diagnostics";
import type { IndexDiagnostic } from "@/lib/rag/types";
import { addDiagnostic } from "@/lib/diagnosticStore";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Allowed model IDs derived from the shared constants
const ALLOWED_MODEL_IDS = new Set(MODELS.map((m) => m.id));

export async function POST(req: Request) {
  try {
    // --- Rate limiting ---
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(clientIp, CHAT_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
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

    // --- API key check ---
    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    }

    // --- Input validation ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = parseChatRequestBody(body);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details:
            process.env.NODE_ENV === "development"
              ? parsed.error.flatten()
              : undefined,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const { model } = parsed.data;
    const messages = parsed.data.messages as UIMessage[];

    // Validate model against allowed list
    const selectedModel =
      model && ALLOWED_MODEL_IDS.has(model)
        ? model
        : MODELS[0].id;

    const modelRelevantMessages = getModelRelevantMessages(messages);
    const messageCountBeforeFilter = messages.length;
    const messageCountAfterFilter = modelRelevantMessages.length;

    // --- Knowledge base readiness (with timeout) ---
    try {
      await Promise.race([
        initializeKnowledgeBase(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Init timeout")), 5000),
        ),
      ]);
    } catch (error) {
      // Continue anyway – the index may already exist from a previous init.
      logger.warn("Knowledge base initialisation was skipped:", error);
    }

    // --- Build system context (RAG) ---
    const lastUserMessage = modelRelevantMessages
      .filter((m) => m.role === "user")
      .pop();
    const userQuery = lastUserMessage
      ? extractTextFromMessage(lastUserMessage)
      : "";

    const requestedAt = Date.now();
    const requestId = nanoid(8);

    let contextDetails: RelevantContextDetails;
    try {
      contextDetails = userQuery
        ? await loadRelevantContextDetails(userQuery)
        : {
            context: await loadFullContext(true),
            systemPromptIncluded: true,
            ragContext: "",
            ragContextTokens: 0,
            results: [],
            usedChunkIds: [],
            fallbackReason: "no-user-query",
          };
    } catch {
      contextDetails = {
        context: await loadFullContext(true),
        systemPromptIncluded: false,
        ragContext: "",
        ragContextTokens: 0,
        results: [],
        usedChunkIds: [],
        fallbackReason: "context-load-error",
      };
    }
    const contextReadyAt = Date.now();

    const mode: "rag" | "full-context" | "fallback" =
      contextDetails.fallbackReason !== null
        ? "fallback"
        : contextDetails.usedChunkIds.length > 0
          ? "rag"
          : "full-context";

    // --- Stream response ---
    const llmStartedAt = Date.now();

    // Capture exactly what gets sent to the LLM (after filtering)
    const sentMessages = modelRelevantMessages.map((m) => ({
      role: m.role as "user" | "assistant",
      content: extractTextFromMessage(m),
    }));

    const result = streamText({
      model: openrouter.chat(selectedModel),
      system: contextDetails.context || undefined,
      messages: convertToModelMessages(modelRelevantMessages),
      onFinish: async ({ finishReason, usage, text }) => {
        const retrieval = createRetrievalDiagnostic({
          results: contextDetails.results,
          usedChunkIds: contextDetails.usedChunkIds,
        });

        let indexSummary: Omit<IndexDiagnostic, "files" | "chunks">;
        try {
          const { FileVectorStore } = await import("@/lib/rag/vectorStore");
          const vs = new FileVectorStore();
          const idx = await vs.loadIndex();
          indexSummary = createIndexDiagnosticSummary(createIndexDiagnostic(idx));
        } catch {
          indexSummary = {
            indexed: false,
            version: null,
            createdAt: null,
            updatedAt: null,
            fileCount: 0,
            chunkCount: 0,
            chunksWithEmbeddings: 0,
          };
        }

        addDiagnostic({
          requestId,
          query: userQuery,
          model: selectedModel,
          requestedAt,
          contextReadyAt,
          retrievalDurationMs: contextReadyAt - requestedAt,
          mode,
          fallbackReason: contextDetails.fallbackReason,
          config: {
            topK: RAG_CONFIG.topK,
            minSimilarity: RAG_CONFIG.minSimilarity,
            maxContextTokens: MAX_CONTEXT_TOKENS,
            chunkTokens: RAG_CONFIG.chunkTokens,
            chunkOverlapTokens: RAG_CONFIG.chunkOverlapTokens,
            embeddingModel: EMBEDDING_MODEL,
          },
          prompt: {
            systemPromptIncluded: contextDetails.systemPromptIncluded,
            systemContextCharacters:
              contextDetails.context.length - contextDetails.ragContext.length,
            ragContextCharacters: contextDetails.ragContext.length,
            ragContextTokens: contextDetails.ragContextTokens,
          },
          index: indexSummary,
          retrieval,
          finishReason,
          tokenUsage: {
            inputTokens: usage.inputTokens,
            outputTokens: usage.outputTokens,
          },
          responseDurationMs: Date.now() - llmStartedAt,
          messageCountBeforeFilter,
          messageCountAfterFilter,
          systemContextFull: contextDetails.context,
          sentMessages,
          responseText: text,
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    logger.error("Error in chat API route:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details:
          process.env.NODE_ENV === "development"
            ? (error instanceof Error ? error.stack : undefined)
            : undefined,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
