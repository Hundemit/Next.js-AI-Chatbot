import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { z } from "zod";

import { getModelRelevantMessages } from "@/lib/chatUtils";
import { parseSuggestionsRequestBody } from "@/lib/chatRequestValidation";
import { loadSuggestionPromptDetails } from "@/lib/loadDocuments";
import { logger } from "@/lib/logger";
import {
  checkRateLimit,
  getClientIp,
  SUGGESTIONS_RATE_LIMIT,
} from "@/lib/rateLimit";
import {
  applySuggestionPolicy,
  SUGGESTION_CATEGORIES,
} from "@/lib/suggestions/policy";
import type { SuggestionApiResponse } from "@/lib/suggestions/types";

// Allow responses up to 30 seconds
export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

const SUGGESTION_MODEL = "google/gemini-2.5-flash-lite";
const GENERATION_INSTRUCTION =
  "Generiere 3 sehr kurze Folgefragen auf Deutsch, die sich auf diesen Chatbot beziehen – seine Funktionsweise, Architektur, das RAG-System, die API, die Komponenten, Implementierung, Integration oder das Deployment. Die Fragen müssen immer kurz sein. Wenn die letzte Antwort vom Thema abweicht, leite das Gespräch zurück zum Chatbot selbst.";
const REQUESTED_MINIMUM = 3;
const REQUESTED_MAXIMUM = 3;
const RETURNED_MAXIMUM = 3;

export async function POST(req: Request) {
  try {
    // --- Rate limiting ---
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(clientIp, SUGGESTIONS_RATE_LIMIT);
    if (!rateLimitResult.allowed) {
      const policyResult = applySuggestionPolicy([], RETURNED_MAXIMUM);
      return Response.json({
        suggestions: policyResult.returnedSuggestions,
      } satisfies SuggestionApiResponse);
    }

    // --- Input validation ---
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      const policyResult = applySuggestionPolicy([], RETURNED_MAXIMUM);
      return Response.json({
        suggestions: policyResult.returnedSuggestions,
      } satisfies SuggestionApiResponse);
    }

    const parsed = parseSuggestionsRequestBody(body);
    if (!parsed.success) {
      const policyResult = applySuggestionPolicy([], RETURNED_MAXIMUM);
      return Response.json({
        suggestions: policyResult.returnedSuggestions,
      } satisfies SuggestionApiResponse);
    }

    const { messages: rawMessages } = parsed.data;
    const messages = rawMessages as UIMessage[];
    const modelRelevantMessages = getModelRelevantMessages(messages);
    const promptDetails = await loadSuggestionPromptDetails();

    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OPENROUTER_API_KEY is not set");
    }

    // Convert messages for the model (only latest turn)
    const modelMessages = convertToModelMessages(modelRelevantMessages).slice(-2);

    // Generate suggestions with structured output
    const result = await generateObject({
      model: openrouter.chat(SUGGESTION_MODEL),
      system: promptDetails.prompt,
      messages: [
        ...modelMessages,
        {
          role: "user" as const,
          content: GENERATION_INSTRUCTION,
        },
      ],
      schema: z.object({
        suggestions: z
          .array(
            z.object({
              question: z.string(),
              category: z.enum(SUGGESTION_CATEGORIES),
            }),
          )
          .min(REQUESTED_MINIMUM)
          .max(REQUESTED_MAXIMUM),
      }),
    });

    // Enforce on-topic scope even if the model ignores the prompt
    const generatedSuggestions = (result.object.suggestions || []).map(
      (suggestion) => suggestion.question,
    );
    const policyResult = applySuggestionPolicy(
      generatedSuggestions,
      RETURNED_MAXIMUM,
    );

    return Response.json({
      suggestions: policyResult.returnedSuggestions,
    } satisfies SuggestionApiResponse);
  } catch (error) {
    logger.error("Error generating suggestions:", error);
    const policyResult = applySuggestionPolicy([], RETURNED_MAXIMUM);
    return Response.json({
      suggestions: policyResult.returnedSuggestions,
    } satisfies SuggestionApiResponse);
  }
}
