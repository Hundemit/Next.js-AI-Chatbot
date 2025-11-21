"use client";

import { memo } from "react";
import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";
import type { Suggestion as SuggestionType } from "@/lib/types";

interface ChatSuggestionsProps {
  initialSuggestions: SuggestionType[];
  dynamicSuggestions: SuggestionType[];
  hasUserMessages: boolean;
  onSuggestionClick: (suggestion: string) => void;
  isLoadingInitial?: boolean;
  initialSuggestionsError?: Error | null;
}

/**
 * ChatSuggestions component - conditionally renders initial or dynamic suggestions.
 * Memoized for performance optimization.
 */
export const ChatSuggestions = memo(function ChatSuggestions({
  initialSuggestions,
  dynamicSuggestions,
  hasUserMessages,
  onSuggestionClick,
  isLoadingInitial = false,
  initialSuggestionsError = null,
}: ChatSuggestionsProps) {
  // Initial Suggestions - shown when no user messages exist
  if (!hasUserMessages) {
    // Show loading state
    if (isLoadingInitial) {
      return (
        <div className="w-full p-2 border-t border-dashed">
          <div className="text-xs text-muted-foreground">Loading suggestions...</div>
        </div>
      );
    }

    // Show error state (non-blocking, just don't show suggestions)
    if (initialSuggestionsError) {
      return null;
    }

    if (initialSuggestions.length === 0) return null;
    return (
      <Suggestions className="w-full p-2 border-t border-dashed">
        {initialSuggestions.map((suggestion, index) => (
          <Suggestion
            key={index}
            index={index}
            suggestion={suggestion}
            onClick={onSuggestionClick}
          />
        ))}
      </Suggestions>
    );
  }

  // Dynamic Suggestions - shown after user messages
  if (dynamicSuggestions.length === 0) return null;

  return (
    <Suggestions className="w-full p-2 gap-2 border-t">
      {dynamicSuggestions.map((suggestion, index) => (
        <Suggestion
          key={index}
          index={index}
          suggestion={suggestion}
          onClick={onSuggestionClick}
        />
      ))}
    </Suggestions>
  );
});

