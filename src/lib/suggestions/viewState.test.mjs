import assert from "node:assert/strict";
import test from "node:test";

import {
  didChatJustBecomeReady,
  getVisibleSuggestions,
  shouldDisableSuggestions,
} from "./viewState.ts";

test("didChatJustBecomeReady only detects streaming to ready transitions", () => {
  assert.equal(didChatJustBecomeReady("streaming", "ready"), true);
  assert.equal(didChatJustBecomeReady("submitted", "ready"), false);
  assert.equal(didChatJustBecomeReady("ready", "ready"), false);
});

test("shouldDisableSuggestions keeps suggestions disabled during pending follow-ups", () => {
  assert.equal(
    shouldDisableSuggestions({
      isLoadingSuggestions: false,
      isChatInProgress: false,
      isWaitingForSuggestions: true,
      stoppedSuggestions: false,
    }),
    true,
  );
});

test("shouldDisableSuggestions re-enables suggestions after the user stops generation", () => {
  assert.equal(
    shouldDisableSuggestions({
      isLoadingSuggestions: true,
      isChatInProgress: true,
      isWaitingForSuggestions: true,
      stoppedSuggestions: true,
    }),
    false,
  );
});

test("getVisibleSuggestions uses dynamic suggestions only after a user turn", () => {
  assert.deepEqual(
    getVisibleSuggestions({
      hasUserMessages: true,
      dynamicSuggestions: ["Welche Projekte passen zu Frontend-Rollen?"],
      initialSuggestions: ["Wer ist Jan?"],
    }),
    ["Welche Projekte passen zu Frontend-Rollen?"],
  );

  assert.deepEqual(
    getVisibleSuggestions({
      hasUserMessages: false,
      dynamicSuggestions: ["Welche Projekte passen zu Frontend-Rollen?"],
      initialSuggestions: ["Wer ist Jan?"],
    }),
    ["Wer ist Jan?"],
  );
});
