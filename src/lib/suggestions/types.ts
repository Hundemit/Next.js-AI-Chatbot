import type { Suggestion } from "@/lib/types";

export interface SuggestionBasisDiagnostic {
  messageCount: number;
  userMessageCount: number;
  assistantMessageCount: number;
  conversationCharacters: number;
  lastAssistantMessageId: string | null;
  lastAssistantCharacters: number;
  lastAssistantPreview: string;
}

export interface SuggestionOutputDiagnostic {
  generatedCount: number;
  acceptedCount: number;
  rejectedCount: number;
  fallbackCount: number;
  rejectedSuggestions: Suggestion[];
  returnedCount: number;
  suggestions: Suggestion[];
}

export interface SuggestionDiagnostic {
  requestId: string;
  status: "success" | "error";
  requestedAt: number;
  completedAt: number;
  durationMs: number;
  trigger: "assistant-response";
  generationMethod: "structured-object";
  chatModel: string | null;
  suggestionModel: string;
  basis: SuggestionBasisDiagnostic;
  prompt: {
    source: string;
    loadedFromFile: boolean;
    characters: number;
    instruction: string;
  };
  schema: {
    outputType: "array<{ question, category }>";
    requestedMinimum: number;
    requestedMaximum: number;
    returnedMaximum: number;
  };
  policy: {
    scope: "career";
    allowedCategories: string[];
    modelBasis: "latest-user-and-assistant";
  };
  output: SuggestionOutputDiagnostic;
  finishReason: string | null;
  usage: {
    inputTokens: number | null;
    outputTokens: number | null;
    totalTokens: number | null;
  };
  warningCount: number;
  error: string | null;
}

export interface SuggestionApiResponse {
  suggestions: Suggestion[];
}
