import { useCallback, useEffect, useState } from "react";

import { UIMessage } from "@ai-sdk/react";
import type { ChatStatus } from "ai";

import { extractTextFromMessage, hasUserMessages } from "@/lib/chatUtils";
import type { Suggestion } from "@/lib/types";

interface UseSuggestionsParams {
  messages: UIMessage[];
  status: ChatStatus;
  selectedModel: string;
}

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  reset: () => void;
}

/**
 * Custom hook to load dynamic suggestions based on the conversation.
 * Automatically fetches suggestions when the assistant responds.
 * Better encapsulation - manages its own state internally.
 *
 * @param messages - Array of chat messages
 * @param status - Current chat status
 * @param selectedModel - Selected AI model ID
 * @returns Object containing suggestions array, loading state, and reset function
 */
export function useSuggestions({
  messages,
  status,
  selectedModel,
}: UseSuggestionsParams): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reset = useCallback(() => {
    setSuggestions([]);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const loadSuggestions = async () => {
      // Early returns for various conditions
      if (
        messages.length === 0 ||
        status === "submitted" ||
        status === "streaming"
      ) {
        return;
      }

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== "assistant") {
        setSuggestions([]);
        setIsLoading(false);
        return;
      }

      if (!hasUserMessages(messages)) {
        return;
      }

      // Extract text from the last assistant message using utility
      const textParts = extractTextFromMessage(lastMessage);

      if (!textParts.trim()) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messages,
            model: selectedModel,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error loading suggestions:", error);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce: Wait briefly before loading suggestions
    const timeoutId = setTimeout(loadSuggestions, 500);

    return () => clearTimeout(timeoutId);
  }, [messages, status, selectedModel]);

  return {
    suggestions,
    isLoading,
    reset,
  };
}
