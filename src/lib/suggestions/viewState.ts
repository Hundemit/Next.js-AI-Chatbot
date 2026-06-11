import type { ChatStatus } from "ai";

import type { Suggestion } from "@/lib/types";

export function didChatJustBecomeReady(
  previousStatus: ChatStatus,
  status: ChatStatus,
) {
  return previousStatus === "streaming" && status === "ready";
}

export function shouldDisableSuggestions({
  isLoadingSuggestions,
  isChatInProgress,
  isWaitingForSuggestions,
  stoppedSuggestions,
}: {
  isLoadingSuggestions: boolean;
  isChatInProgress: boolean;
  isWaitingForSuggestions: boolean;
  stoppedSuggestions: boolean;
}) {
  if (stoppedSuggestions) {
    return false;
  }

  return isLoadingSuggestions || isChatInProgress || isWaitingForSuggestions;
}

export function getVisibleSuggestions({
  hasUserMessages,
  dynamicSuggestions,
  initialSuggestions,
}: {
  hasUserMessages: boolean;
  dynamicSuggestions: Suggestion[];
  initialSuggestions: Suggestion[];
}) {
  return hasUserMessages && dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : initialSuggestions;
}
