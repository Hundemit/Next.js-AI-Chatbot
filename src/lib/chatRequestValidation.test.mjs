import assert from "node:assert/strict";
import test from "node:test";

import {
  CHAT_REQUEST_LIMITS,
  parseChatRequestBody,
  parseSuggestionsRequestBody,
} from "./chatRequestValidation.ts";

const createMessage = ({
  id = "message-1",
  role = "user",
  text = "Welche Projekte hat Jan umgesetzt?",
} = {}) => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

test("parseChatRequestBody accepts compact text-only chat messages", () => {
  const result = parseChatRequestBody({
    messages: [createMessage()],
    model: "google/gemini-2.5-flash-lite",
  });

  assert.equal(result.success, true);
});

test("parseChatRequestBody accepts AI SDK transport metadata", () => {
  const result = parseChatRequestBody({
    id: "chat-1",
    trigger: "submit-message",
    messages: [createMessage()],
    model: "google/gemini-2.5-flash-lite",
  });

  assert.equal(result.success, true);
});

test("parseChatRequestBody accepts completed AI SDK assistant messages with step parts", () => {
  const result = parseChatRequestBody({
    id: "chat-1",
    trigger: "submit-message",
    messages: [
      createMessage({ id: "user-1", text: "Welche Projekte hat Jan?" }),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          { type: "step-start" },
          { type: "text", text: "Jan hat mehrere Frontend-Projekte umgesetzt." },
        ],
      },
      createMessage({ id: "user-2", text: "Welche davon nutzen Next.js?" }),
    ],
    model: "google/gemini-2.5-flash-lite",
  });

  assert.equal(result.success, true);
});

test("parseChatRequestBody accepts completed AI SDK assistant messages with rich response parts", () => {
  const result = parseChatRequestBody({
    id: "chat-1",
    trigger: "submit-message",
    messages: [
      createMessage({ id: "user-1", text: "Wo wohnst du?" }),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "Die Antwort steht im Portfolio-Kontext.",
            state: "done",
            providerMetadata: { openrouter: { model: "test-model" } },
          },
          {
            type: "text",
            text: "Ich lebe in Trappenkamp in Deutschland.",
            providerMetadata: { openrouter: { model: "test-model" } },
          },
          {
            type: "source-url",
            sourceId: "source-1",
            url: "https://example.com/profile",
            title: "Profil",
          },
        ],
      },
      createMessage({ id: "user-2", text: "Wo wohnst du?" }),
    ],
    model: "x-ai/grok-4.3",
  });

  assert.equal(result.success, true);
});

test("parseSuggestionsRequestBody accepts completed AI SDK assistant messages with rich response parts", () => {
  const result = parseSuggestionsRequestBody({
    messages: [
      createMessage({ id: "user-1", text: "Wo wohnst du?" }),
      {
        id: "assistant-1",
        role: "assistant",
        parts: [
          {
            type: "reasoning",
            text: "Die Antwort steht im Portfolio-Kontext.",
            state: "done",
          },
          {
            type: "text",
            text: "Ich lebe in Trappenkamp in Deutschland.",
            state: "done",
          },
        ],
      },
    ],
    model: "x-ai/grok-4.3",
  });

  assert.equal(result.success, true);
});

test("parseChatRequestBody rejects oversized individual text parts", () => {
  const result = parseChatRequestBody({
    messages: [
      createMessage({
        text: "A".repeat(CHAT_REQUEST_LIMITS.maxTextPartLength + 1),
      }),
    ],
  });

  assert.equal(result.success, false);
});

test("parseChatRequestBody rejects oversized aggregate conversation text", () => {
  const text = "A".repeat(CHAT_REQUEST_LIMITS.maxTextPartLength);
  const result = parseChatRequestBody({
    messages: [
      createMessage({ id: "message-1", text }),
      createMessage({ id: "message-2", role: "assistant", text }),
      createMessage({ id: "message-3", text }),
      createMessage({ id: "message-4", role: "assistant", text: "A" }),
    ],
  });

  assert.equal(result.success, false);
});

test("parseSuggestionsRequestBody rejects non-text message parts", () => {
  const result = parseSuggestionsRequestBody({
    messages: [
      {
        id: "message-1",
        role: "user",
        parts: [{ type: "file", url: "https://example.com/file.pdf" }],
      },
    ],
  });

  assert.equal(result.success, false);
});

test("parseSuggestionsRequestBody rejects too many messages", () => {
  const result = parseSuggestionsRequestBody({
    messages: Array.from(
      { length: CHAT_REQUEST_LIMITS.maxMessages + 1 },
      (_, index) => createMessage({ id: `message-${index}` }),
    ),
  });

  assert.equal(result.success, false);
});
