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
