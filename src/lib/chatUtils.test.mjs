import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_ABORT_NOTICE_TEXT,
  getAssistantLoadingState,
  getModelRelevantMessages,
  isAbortNoticeMessage,
  markLatestTurnAsAborted,
  shouldKeepExistingSuggestionsForMessages,
  shouldRequestSuggestionsForMessages,
} from "./chatUtils.ts";

const createMessage = ({ id, role, text = "", metadata }) => ({
  id,
  role,
  parts: [{ type: "text", text }],
  ...(metadata ? { metadata } : {}),
});

test("getAssistantLoadingState shows a synthetic assistant loader after the latest user message while waiting", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Erzähl mir mehr" }),
  ];

  assert.deepEqual(getAssistantLoadingState(messages, true), {
    isVisible: true,
    loadingMessageId: null,
    loadingAfterMessageId: "user-1",
    shouldDelayLoadingMessage: true,
  });
});

test("getAssistantLoadingState targets the empty assistant message instead of hiding it", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Erzähl mir mehr" }),
    createMessage({ id: "assistant-2", role: "assistant" }),
  ];

  assert.deepEqual(getAssistantLoadingState(messages, true), {
    isVisible: true,
    loadingMessageId: "assistant-2",
    loadingAfterMessageId: "user-1",
    shouldDelayLoadingMessage: true,
  });
});

test("getAssistantLoadingState hides the loader once assistant text is ready", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Erzähl mir mehr" }),
    createMessage({ id: "assistant-2", role: "assistant", text: "Gerne." }),
  ];

  assert.deepEqual(getAssistantLoadingState(messages, true), {
    isVisible: false,
    loadingMessageId: null,
    loadingAfterMessageId: null,
    shouldDelayLoadingMessage: false,
  });
});

test("markLatestTurnAsAborted excludes an unanswered user question and keeps newer questions relevant", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Wie heißt du?" }),
  ];

  const abortedMessages = markLatestTurnAsAborted(messages, () => "abort-1");
  const nextMessages = [
    ...abortedMessages,
    createMessage({
      id: "user-2",
      role: "user",
      text: "Welche Berufserfahrung hast du?",
    }),
  ];

  assert.deepEqual(
    getModelRelevantMessages(nextMessages).map((message) => message.id),
    ["assistant-1", "user-2"],
  );
});

test("markLatestTurnAsAborted appends exactly one visible abort notice", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Wie heißt du?" }),
  ];

  const once = markLatestTurnAsAborted(messages, () => "abort-1");
  const twice = markLatestTurnAsAborted(once, () => "abort-2");

  assert.equal(once.length, 3);
  assert.deepEqual(twice, once);
  assert.equal(isAbortNoticeMessage(once[2]), true);
  assert.equal(once[2].role, "assistant");
  assert.equal(once[2].parts[0].text, CHAT_ABORT_NOTICE_TEXT);
});

test("markLatestTurnAsAborted excludes partial assistant output after the aborted user question", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Wie heißt du?" }),
    createMessage({ id: "assistant-2", role: "assistant", text: "Ich" }),
  ];

  const abortedMessages = markLatestTurnAsAborted(messages, () => "abort-1");

  assert.deepEqual(
    getModelRelevantMessages(abortedMessages).map((message) => message.id),
    ["assistant-1"],
  );
});

test("markLatestTurnAsAborted preserves earlier answered turns in the model context", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Wer bist du?" }),
    createMessage({ id: "assistant-2", role: "assistant", text: "Ich bin Jan." }),
    createMessage({ id: "user-2", role: "user", text: "Wie heißt du?" }),
  ];

  const abortedMessages = markLatestTurnAsAborted(messages, () => "abort-1");

  assert.deepEqual(
    getModelRelevantMessages(abortedMessages).map((message) => message.id),
    ["assistant-1", "user-1", "assistant-2"],
  );
});

test("shouldRequestSuggestionsForMessages ignores abort notices", () => {
  const messages = [
    createMessage({ id: "assistant-1", role: "assistant", text: "Hallo" }),
    createMessage({ id: "user-1", role: "user", text: "Wie heißt du?" }),
  ];
  const abortedMessages = markLatestTurnAsAborted(messages, () => "abort-1");

  assert.equal(
    shouldRequestSuggestionsForMessages(abortedMessages, "ready", false),
    false,
  );
});

test("shouldRequestSuggestionsForMessages only uses model-relevant user turns", () => {
  const messages = [
    createMessage({
      id: "user-1",
      role: "user",
      text: "Wie heißt du?",
      metadata: { excludeFromModel: true },
    }),
    createMessage({
      id: "assistant-1",
      role: "assistant",
      text: "Antwort",
    }),
  ];

  assert.equal(
    shouldRequestSuggestionsForMessages(messages, "ready", false),
    false,
  );
});

test("shouldRequestSuggestionsForMessages accepts completed relevant assistant turns", () => {
  const messages = [
    createMessage({ id: "user-1", role: "user", text: "Welche Projekte?" }),
    createMessage({ id: "assistant-1", role: "assistant", text: "Projekt A" }),
  ];

  assert.equal(
    shouldRequestSuggestionsForMessages(messages, "ready", false),
    true,
  );
});

test("shouldKeepExistingSuggestionsForMessages preserves suggestions after abort notices", () => {
  const messages = [
    createMessage({ id: "user-1", role: "user", text: "Welche Projekte?" }),
  ];
  const abortedMessages = markLatestTurnAsAborted(messages, () => "abort-1");

  assert.equal(shouldKeepExistingSuggestionsForMessages(abortedMessages), true);
});

test("shouldKeepExistingSuggestionsForMessages does not preserve for completed assistant answers", () => {
  const messages = [
    createMessage({ id: "user-1", role: "user", text: "Welche Projekte?" }),
    createMessage({ id: "assistant-1", role: "assistant", text: "Projekt A" }),
  ];

  assert.equal(shouldKeepExistingSuggestionsForMessages(messages), false);
});
