import type { UIMessage } from "ai";

import { extractTextFromMessage } from "../chatUtils.ts";
import type {
  SuggestionBasisDiagnostic,
  SuggestionOutputDiagnostic,
} from "./types";

const PREVIEW_LENGTH = 200;

export function createSuggestionBasisDiagnostic(
  messages: UIMessage[],
): SuggestionBasisDiagnostic {
  let userMessageCount = 0;
  let assistantMessageCount = 0;
  let conversationCharacters = 0;
  let lastAssistantMessage: UIMessage | undefined;

  for (const message of messages) {
    const text = extractTextFromMessage(message);
    conversationCharacters += text.length;

    if (message.role === "user") {
      userMessageCount++;
    } else if (message.role === "assistant") {
      assistantMessageCount++;
      lastAssistantMessage = message;
    }
  }

  const lastAssistantText = lastAssistantMessage
    ? extractTextFromMessage(lastAssistantMessage)
    : "";
  const normalizedPreview = lastAssistantText.replace(/\s+/g, " ").trim();

  return {
    messageCount: messages.length,
    userMessageCount,
    assistantMessageCount,
    conversationCharacters,
    lastAssistantMessageId: lastAssistantMessage?.id ?? null,
    lastAssistantCharacters: lastAssistantText.length,
    lastAssistantPreview:
      normalizedPreview.length > PREVIEW_LENGTH
        ? `${normalizedPreview.slice(0, PREVIEW_LENGTH)}...`
        : normalizedPreview,
  };
}

export function createSuggestionOutputDiagnostic({
  acceptedSuggestions,
  generatedSuggestions,
  rejectedSuggestions,
  returnedSuggestions,
}: {
  acceptedSuggestions: string[];
  generatedSuggestions: string[];
  rejectedSuggestions: string[];
  returnedSuggestions: string[];
}): SuggestionOutputDiagnostic {
  return {
    generatedCount: generatedSuggestions.length,
    acceptedCount: acceptedSuggestions.length,
    rejectedCount: rejectedSuggestions.length,
    fallbackCount: Math.max(
      0,
      returnedSuggestions.length - acceptedSuggestions.length,
    ),
    rejectedSuggestions,
    returnedCount: returnedSuggestions.length,
    suggestions: returnedSuggestions,
  };
}
