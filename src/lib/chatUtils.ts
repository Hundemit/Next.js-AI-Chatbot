import type { UIMessage } from "@ai-sdk/react";

export const CHAT_ABORT_NOTICE_TEXT = "Frage abgebrochen.";

export interface ChatMessageMetadata {
  excludeFromModel?: boolean;
  abortNotice?: boolean;
  aborted?: boolean;
}

/**
 * Extracts text content from a UIMessage by filtering and joining text parts.
 * This eliminates code duplication across components.
 *
 * @param message - The UIMessage to extract text from
 * @returns The extracted text content as a string, or empty string if no text parts found
 */
export function extractTextFromMessage(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("") || ""
  );
}

/**
 * Checks if the messages array contains any user messages.
 *
 * @param messages - Array of UIMessages to check
 * @returns True if at least one user message exists, false otherwise
 */
export function hasUserMessages(messages: UIMessage[]): boolean {
  return messages.some((msg) => msg.role === "user");
}

/**
 * Checks if a message is empty (no text content).
 *
 * @param message - The UIMessage to check
 * @returns True if the message has no text content, false otherwise
 */
export function isMessageEmpty(message: UIMessage): boolean {
  return !extractTextFromMessage(message).trim();
}

function getChatMessageMetadata(message: UIMessage): ChatMessageMetadata {
  if (
    message.metadata &&
    typeof message.metadata === "object" &&
    !Array.isArray(message.metadata)
  ) {
    return message.metadata as ChatMessageMetadata;
  }

  return {};
}

function withChatMessageMetadata(
  message: UIMessage,
  metadata: ChatMessageMetadata
): UIMessage {
  return {
    ...message,
    metadata: {
      ...getChatMessageMetadata(message),
      ...metadata,
    },
  };
}

export function isAbortNoticeMessage(message: UIMessage): boolean {
  return getChatMessageMetadata(message).abortNotice === true;
}

export function getModelRelevantMessages(messages: UIMessage[]): UIMessage[] {
  return messages.filter(
    (message) => getChatMessageMetadata(message).excludeFromModel !== true
  );
}

export function shouldRequestSuggestionsForMessages(
  messages: UIMessage[],
  status: string,
  stopped: boolean
): boolean {
  if (
    messages.length === 0 ||
    status === "submitted" ||
    status === "streaming" ||
    stopped
  ) {
    return false;
  }

  const lastMessage = messages[messages.length - 1];

  if (
    lastMessage.role !== "assistant" ||
    isAbortNoticeMessage(lastMessage) ||
    getChatMessageMetadata(lastMessage).excludeFromModel === true ||
    isMessageEmpty(lastMessage)
  ) {
    return false;
  }

  return hasUserMessages(getModelRelevantMessages(messages));
}

export function shouldKeepExistingSuggestionsForMessages(
  messages: UIMessage[]
): boolean {
  const lastMessage = messages[messages.length - 1];
  return Boolean(lastMessage && isAbortNoticeMessage(lastMessage));
}

export function markLatestTurnAsAborted(
  messages: UIMessage[],
  createId: () => string
): UIMessage[] {
  const lastAbortNoticeIndex = messages.findLastIndex(isAbortNoticeMessage);
  const lastMessage = messages[messages.length - 1];

  if (!lastMessage) {
    return messages;
  }

  const userMessageIndex = messages.findLastIndex(
    (message) =>
      message.role === "user" &&
      getChatMessageMetadata(message).excludeFromModel !== true
  );

  if (
    lastAbortNoticeIndex !== -1 &&
    (userMessageIndex === -1 || lastAbortNoticeIndex > userMessageIndex)
  ) {
    return messages.slice(0, lastAbortNoticeIndex + 1);
  }

  if (userMessageIndex === -1) {
    return messages;
  }

  const messagesBeforeAbortNotice = messages.slice(0, userMessageIndex + 1);
  const userMessage = messagesBeforeAbortNotice[userMessageIndex];
  messagesBeforeAbortNotice[userMessageIndex] = withChatMessageMetadata(
    userMessage,
    {
      aborted: true,
      excludeFromModel: true,
    }
  );

  return [
    ...messagesBeforeAbortNotice,
    {
      id: createId(),
      role: "assistant",
      metadata: {
        abortNotice: true,
        excludeFromModel: true,
      },
      parts: [
        {
          type: "text",
          text: CHAT_ABORT_NOTICE_TEXT,
        },
      ],
    },
  ];
}

interface AssistantLoadingState {
  isVisible: boolean;
  loadingMessageId: string | null;
  loadingAfterMessageId: string | null;
  shouldDelayLoadingMessage: boolean;
}

/**
 * Determines the single assistant loading state across both wait phases:
 * before the assistant message exists and while an empty assistant message streams.
 */
export function getAssistantLoadingState(
  messages: UIMessage[],
  isChatInProgress: boolean
): AssistantLoadingState {
  if (!isChatInProgress || messages.length === 0) {
    return {
      isVisible: false,
      loadingMessageId: null,
      loadingAfterMessageId: null,
      shouldDelayLoadingMessage: false,
    };
  }

  const lastMessage = messages[messages.length - 1];

  if (lastMessage.role === "user") {
    return {
      isVisible: true,
      loadingMessageId: null,
      loadingAfterMessageId: lastMessage.id,
      shouldDelayLoadingMessage: true,
    };
  }

  if (lastMessage.role === "assistant" && isMessageEmpty(lastMessage)) {
    const previousUserMessage = messages
      .slice(0, -1)
      .findLast((message) => message.role === "user");

    return {
      isVisible: true,
      loadingMessageId: lastMessage.id,
      loadingAfterMessageId: previousUserMessage?.id ?? null,
      shouldDelayLoadingMessage: true,
    };
  }

  return {
    isVisible: false,
    loadingMessageId: null,
    loadingAfterMessageId: null,
    shouldDelayLoadingMessage: false,
  };
}

/**
 * Formats a technical error into a user-friendly message.
 *
 * @param error - The error object or string
 * @returns A user-friendly error message
 */
export function formatErrorMessage(error: unknown): string {
  let message: string;

  if (error instanceof Error) {
    if (error.name === "AbortError") {
      message = "Die Anfrage wurde abgebrochen. Bitte versuchen Sie es erneut.";
    } else if (error.message.includes("Network Error")) {
      message =
        "Verbindungsproblem. Bitte überprüfen Sie Ihre Internetverbindung.";
    } else if (error.message.includes("Timeout")) {
      message =
        "Die Anfrage hat zu lange gedauert. Bitte versuchen Sie es erneut.";
    } else if (error.message.includes("User not found")) {
      message =
        "Es gab ein Problem mit der API-Verbindung. Bitte versuchen Sie es später erneut oder kontaktieren Sie den Administrator.";
    } else {
      message =
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
    }
  } else if (typeof error === "string") {
    let parsedError: unknown;
    try {
      parsedError = JSON.parse(error);
    } catch (parseError) {
      console.error("Error parsing JSON:", parseError);
    }
    if (
      parsedError &&
      typeof parsedError === "object" &&
      "error" in parsedError &&
      typeof (parsedError as { error: string }).error === "string"
    ) {
      message = (parsedError as { error: string }).error;
    } else {
      message = error;
    }
  } else if (
    typeof error === "object" &&
    error !== null &&
    "error" in error &&
    typeof (error as { error: string }).error === "string"
  ) {
    message = (error as { error: string }).error;
  } else {
    message =
      "Ein unbekannter Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
  }

  return `Entschuldigung, ${message}`;
}
