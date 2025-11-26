import { useCallback, useEffect, useRef, useState } from "react";

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
  stop: () => void;
  stopped: boolean;
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
  const [stopped, setStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSuggestions([]);
    setIsLoading(false);
    setStopped(false);
  }, []);

  const stop = useCallback(() => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStopped(true);
    setIsLoading(false);

    console.log("Suggestions stopped by user");
  }, []);

  useEffect(() => {
    // Reset stopped flag when a new chat starts
    if (status === "submitted") {
      setStopped(false);
    }

    const loadSuggestions = async () => {
      // Early returns for various conditions
      if (
        messages.length === 0 ||
        status === "submitted" ||
        status === "streaming" ||
        stopped
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

      // Create new AbortController for this request
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

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
          signal: abortController.signal,
        });

        // Check if request was aborted
        if (abortController.signal.aborted) {
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
          console.log("suggestions loaded successfully", data.suggestions);
        } else {
          setSuggestions([]);
          console.log("suggestions not loaded");
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        console.error("Error loading suggestions:", error);
        setSuggestions([]);
      } finally {
        // Only update loading state if this request wasn't aborted
        if (!abortController.signal.aborted) {
          setIsLoading(false);
        }
        // Clear the ref if this was the current request
        if (abortControllerRef.current === abortController) {
          abortControllerRef.current = null;
        }
      }
    };

    // Debounce: Wait briefly before loading suggestions
    // Only schedule if not already stopped
    if (stopped) {
      return;
    }
    const timeoutId = setTimeout(loadSuggestions, 500);

    return () => {
      clearTimeout(timeoutId);
      // Abort any ongoing request when effect cleanup runs
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [messages, status, stopped, selectedModel]);

  return {
    suggestions,
    isLoading,
    reset,
    stop,
    stopped,
  };
}
