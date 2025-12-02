"use client";

import { memo, useEffect, useMemo, useState, useRef } from "react";

import { useChatContext } from "./ChatContext";

import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";
import { StatusBadges } from "@/components/status-badges";

/**
 * ChatSuggestions component - conditionally renders initial or dynamic suggestions.
 * Memoized for performance optimization.
 */
export const ChatSuggestions = memo(function ChatSuggestions() {
  const {
    initialSuggestions,
    suggestions: dynamicSuggestions,
    hasUserMessages,
    handleSuggestionClick,
    isLoadingSuggestions,
    isChatInProgress,
    stoppedSuggestions,
    chatIsStopped,
    isChatbotTyping,
    status,
  } = useChatContext();

  // Track if we're in the transition period after chat finishes
  const [isWaitingForSuggestions, setIsWaitingForSuggestions] = useState(false);
  const previousStatusRef = useRef<typeof status>(status);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Detect transition from streaming to ready
    const transitionedToReady =
      previousStatusRef.current === "streaming" && status === "ready";

    if (transitionedToReady) {
      // Clear any existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      // Set waiting state asynchronously to avoid synchronous setState warning
      const timeoutId = setTimeout(() => {
        setIsWaitingForSuggestions(true);
        // Clear the flag after debounce timeout (500ms) + small buffer
        timeoutRef.current = setTimeout(() => {
          setIsWaitingForSuggestions(false);
          timeoutRef.current = null;
        }, 600);
      }, 0);
      timeoutRef.current = timeoutId;
    }

    // Clear flag when suggestions start loading
    if (isLoadingSuggestions) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      // Set state asynchronously to avoid synchronous setState warning
      setTimeout(() => {
        setIsWaitingForSuggestions(false);
      }, 0);
    }

    previousStatusRef.current = status;

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [status, isLoadingSuggestions]);

  const disabled = useMemo(
    () =>
      (isLoadingSuggestions && !stoppedSuggestions) ||
      (isChatInProgress && !stoppedSuggestions) ||
      // Disable during transition period after chat finishes
      (isWaitingForSuggestions && !stoppedSuggestions),
    [
      isLoadingSuggestions,
      stoppedSuggestions,
      isChatInProgress,
      isWaitingForSuggestions,
    ]
  );

  // Show dynamic suggestions when user has messages and dynamic suggestions are available
  const showDynamic = useMemo(() => {
    return hasUserMessages && dynamicSuggestions.length > 0;
  }, [hasUserMessages, dynamicSuggestions.length]);

  // Determine which suggestions to display
  const suggestions = useMemo(() => {
    return showDynamic ? dynamicSuggestions : initialSuggestions;
  }, [showDynamic, dynamicSuggestions, initialSuggestions]);

  return (
    <Suggestions className="w-full gap-2 border-t border-dashed p-2">
      {/* <StatusBadges
        values={{
          hasUserMessages,
          isLoadingSuggestions: isLoadingSuggestions,
          isChatInProgress: isChatInProgress,
          isWaitingForSuggestions: isWaitingForSuggestions,
          stoppedSuggestions: stoppedSuggestions,
        }}
      /> */}
      {suggestions.map((suggestion, index) => (
        <Suggestion
          key={suggestion}
          index={index}
          suggestion={suggestion}
          onClick={handleSuggestionClick}
          disabled={disabled}
        />
      ))}
    </Suggestions>
  );
});
