import assert from "node:assert/strict";
import test from "node:test";

import {
  applySuggestionPolicy,
  isOnTopicSuggestion,
} from "./policy.ts";

test("isOnTopicSuggestion rejects off-topic questions", () => {
  assert.equal(isOnTopicSuggestion("Wie oft gehst du ins Fitnessstudio?"), false);
  assert.equal(isOnTopicSuggestion("Welche Musik hörst du am liebsten?"), false);
});

test("isOnTopicSuggestion accepts questions about the chatbot", () => {
  assert.equal(
    isOnTopicSuggestion("Wie funktioniert das RAG-System?"),
    true,
  );
  assert.equal(
    isOnTopicSuggestion("Welche API-Endpunkte gibt es?"),
    true,
  );
});

test("applySuggestionPolicy removes off-topic suggestions and fills the result", () => {
  const result = applySuggestionPolicy([
    "Wie oft gehst du ins Fitnessstudio?",
    "Wie funktioniert das RAG-System?",
    "Welche Musik hörst du am liebsten?",
  ]);

  assert.deepEqual(result.acceptedSuggestions, [
    "Wie funktioniert das RAG-System?",
  ]);
  assert.equal(result.rejectedSuggestions.length, 2);
  assert.equal(result.returnedSuggestions.length, 5);
  assert.equal(
    result.returnedSuggestions.every(isOnTopicSuggestion),
    true,
  );
});

test("applySuggestionPolicy removes duplicate suggestions", () => {
  const result = applySuggestionPolicy([
    "Wie ist der Chatbot aufgebaut?",
    "Wie ist der Chatbot aufgebaut?",
  ]);

  assert.equal(result.acceptedSuggestions.length, 1);
});
