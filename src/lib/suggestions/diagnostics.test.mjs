import assert from "node:assert/strict";
import test from "node:test";

import {
  createSuggestionBasisDiagnostic,
  createSuggestionOutputDiagnostic,
} from "./diagnostics.ts";

const messages = [
  {
    id: "user-1",
    role: "user",
    parts: [{ type: "text", text: "How does retrieval work?" }],
  },
  {
    id: "assistant-1",
    role: "assistant",
    parts: [{ type: "text", text: "A".repeat(300) }],
  },
];

test("createSuggestionBasisDiagnostic summarizes the conversation basis", () => {
  const diagnostic = createSuggestionBasisDiagnostic(messages);

  assert.equal(diagnostic.messageCount, 2);
  assert.equal(diagnostic.userMessageCount, 1);
  assert.equal(diagnostic.assistantMessageCount, 1);
  assert.equal(diagnostic.lastAssistantMessageId, "assistant-1");
  assert.equal(diagnostic.lastAssistantCharacters, 300);
  assert.equal(diagnostic.lastAssistantPreview.length, 203);
});

test("createSuggestionOutputDiagnostic distinguishes generated and returned suggestions", () => {
  const diagnostic = createSuggestionOutputDiagnostic({
    generatedSuggestions: ["One", "Two", "Three", "Four", "Five", "Six"],
    acceptedSuggestions: ["One", "Two", "Three"],
    rejectedSuggestions: ["Four", "Five", "Six"],
    returnedSuggestions: ["One", "Two", "Three", "Four", "Five"],
  });

  assert.equal(diagnostic.generatedCount, 6);
  assert.equal(diagnostic.acceptedCount, 3);
  assert.equal(diagnostic.rejectedCount, 3);
  assert.equal(diagnostic.returnedCount, 5);
  assert.deepEqual(diagnostic.suggestions, ["One", "Two", "Three", "Four", "Five"]);
});
