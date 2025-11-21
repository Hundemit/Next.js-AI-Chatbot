import type { UIMessage } from "@ai-sdk/react";

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


