import { useCallback, useEffect, useRef, useState } from "react";

import { UIMessage } from "@ai-sdk/react";
import type { ChatStatus } from "ai";

import {
  extractTextFromMessage,
  getModelRelevantMessages,
  shouldKeepExistingSuggestionsForMessages,
  shouldRequestSuggestionsForMessages,
} from "@/lib/chatUtils";
import { logger } from "@/lib/logger";
import { didChatJustBecomeReady } from "@/lib/suggestions/viewState";
import type { Suggestion } from "@/lib/types";

interface UseSuggestionsParams {
  messages: UIMessage[];
  status: ChatStatus;
  selectedModel: string;
}

interface UseSuggestionsReturn {
  suggestions: Suggestion[];
  isLoading: boolean;
  isWaitingForSuggestions: boolean;
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
  const [isWaitingForSuggestions, setIsWaitingForSuggestions] = useState(false);
  const [stopped, setStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const previousStatusRef = useRef<ChatStatus>(status);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const reset = useCallback(() => {
    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setSuggestions([]);
    setIsLoading(false);
    setIsWaitingForSuggestions(false);
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
    setIsWaitingForSuggestions(false);

    logger.debug("Suggestions stopped by user");
  }, []);

  useEffect(() => {
    if (didChatJustBecomeReady(previousStatusRef.current, status)) {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      setIsWaitingForSuggestions(true);
      transitionTimeoutRef.current = setTimeout(() => {
        setIsWaitingForSuggestions(false);
        transitionTimeoutRef.current = null;
      }, 600);
    }

    if (isLoading) {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
      setIsWaitingForSuggestions(false);
    }

    previousStatusRef.current = status;

    return () => {
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
        transitionTimeoutRef.current = null;
      }
    };
  }, [status, isLoading]);

  useEffect(() => {
    // Reset stopped flag when a new chat starts
    if (status === "submitted") {
      setStopped(false);
    }

    const shouldRequestSuggestions = shouldRequestSuggestionsForMessages(
      messages,
      status,
      stopped
    );

    const lastMessage = messages[messages.length - 1];
    if (!shouldRequestSuggestions) {
      if (shouldKeepExistingSuggestionsForMessages(messages)) {
        setIsLoading(false);
      }
      return;
    }

    const loadSuggestions = async () => {
      // Extract text from the last assistant message using utility
      const textParts = extractTextFromMessage(lastMessage);
      const modelRelevantMessages = getModelRelevantMessages(messages);

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
            messages: modelRelevantMessages,
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
          logger.debug("Suggestions loaded successfully");
        } else {
          setSuggestions([]);
          logger.debug("Suggestions not loaded");
        }
      } catch (error) {
        // Ignore abort errors
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }
        logger.error("Error loading suggestions:", error);
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
      // Abort any ongoing request when effect cleanup runs.
      // The aborted request's finally skips setIsLoading(false), so clear it
      // here to avoid getting stuck in the loading state when no follow-up
      // request is scheduled.
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
        setIsLoading(false);
      }
    };
  }, [messages, status, stopped, selectedModel]);

  return {
    suggestions,
    isLoading,
    isWaitingForSuggestions,
    reset,
    stop,
    stopped,
  };
}
