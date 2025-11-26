"use client";

import { memo, useEffect, useMemo, useState } from "react";

import { useChatContext } from "./ChatContext";

import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";

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
  } = useChatContext();
  const [disabled, setDisabled] = useState(
    (isLoadingSuggestions && !stoppedSuggestions) ||
      (isChatInProgress && !stoppedSuggestions),
  );

  useEffect(() => {
    setDisabled(
      (isLoadingSuggestions && !stoppedSuggestions) ||
        (isChatInProgress && !stoppedSuggestions),
    );
  }, [isLoadingSuggestions, stoppedSuggestions, isChatInProgress]);

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
      {/* <Badge
        className={cn(
          "text-muted-foreground text-xs",
          chatIsStopped ? "bg-green-500 text-white" : "bg-red-500 text-white",
        )}
      >
        {chatIsStopped ? "chatIsStopped: true" : "chatIsStopped: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatbotTyping ? "bg-green-500 text-white" : "bg-red-500 text-white",
        )}
      >
        {isChatbotTyping ? "isChatbotTyping: true" : "isChatbotTyping: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isLoadingSuggestions
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white",
        )}
      >
        {isLoadingSuggestions
          ? "isLoadingSuggestions: true"
          : "isLoadingSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          disabled ? "bg-green-500 text-white" : "bg-red-500 text-white",
        )}
      >
        {disabled ? "DisabledSuggestions: true" : "DisabledSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatInProgress
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white",
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
            : "bg-red-500 text-white",
        )}
      >
        {stoppedSuggestions
          ? "stoppedSuggestions: true"
          : "stoppedSuggestions: false"}
      </Badge> */}
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
