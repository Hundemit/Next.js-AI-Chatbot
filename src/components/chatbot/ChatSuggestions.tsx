"use client";

import { memo } from "react";

import { useChatSuggestionsContext } from "./ChatContext";

import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";
import {
  getVisibleSuggestions,
  shouldDisableSuggestions,
} from "@/lib/suggestions/viewState";

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
    isWaitingForSuggestions,
    stoppedSuggestions,
  } = useChatSuggestionsContext();

  const disabled = shouldDisableSuggestions({
    isLoadingSuggestions,
    isChatInProgress,
    isWaitingForSuggestions,
    stoppedSuggestions,
  });

  const suggestions = getVisibleSuggestions({
    hasUserMessages,
    dynamicSuggestions,
    initialSuggestions,
  });

  return (
    <Suggestions className="w-full gap-2 border-t border-dashed p-2">
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
