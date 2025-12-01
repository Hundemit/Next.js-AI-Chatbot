"use client";

import { memo, useEffect, useMemo, useState, useRef } from "react";

import { useChatContext } from "./ChatContext";

import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";

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
      {(() => {
        // Map status values to colors
        const statusColorMap: Record<string, string> = {
          submitted: "bg-blue-500 text-white",
          streaming: "bg-yellow-500 text-white",
          ready: "bg-green-500 text-white",
          error: "bg-red-500 text-white",
        };
        const colorClass =
          status && statusColorMap[status]
            ? statusColorMap[status]
            : "bg-gray-400 text-white";
        return (
          <Badge className={cn("text-muted-foreground text-xs", colorClass)}>
            {status}
          </Badge>
        );
      })()}
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          hasUserMessages ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {hasUserMessages ? "hasUserMessages: true" : "hasUserMessages: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          chatIsStopped ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {chatIsStopped ? "chatIsStopped: true" : "chatIsStopped: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatbotTyping ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {isChatbotTyping ? "isChatbotTyping: true" : "isChatbotTyping: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isLoadingSuggestions
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}
      >
        {isLoadingSuggestions
          ? "isLoadingSuggestions: true"
          : "isLoadingSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          disabled ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {disabled ? "DisabledSuggestions: true" : "DisabledSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatInProgress ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {isChatInProgress
          ? "isChatInProgress: true"
          : "isChatInProgress: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          stoppedSuggestions
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}
      >
        {stoppedSuggestions
          ? "stoppedSuggestions: true"
          : "stoppedSuggestions: false"}
      </Badge>
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
