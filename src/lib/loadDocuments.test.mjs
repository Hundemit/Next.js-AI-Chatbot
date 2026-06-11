import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, test } from "node:test";
import { pathToFileURL } from "node:url";

const originalCwd = process.cwd();
const testDirs = [];

afterEach(async () => {
  process.chdir(originalCwd);

  await Promise.all(
    testDirs.map((dir) => rm(dir, { recursive: true, force: true })),
  );
  testDirs.length = 0;
});

async function importLoadDocumentsFrom(cwd) {
  process.chdir(cwd);

  const moduleUrl = pathToFileURL(
    join(originalCwd, "src", "lib", "loadDocuments.ts"),
  ).href;

  return import(`${moduleUrl}?cacheBust=${Date.now()}-${Math.random()}`);
}

test("logs an error when the system and suggestion prompt paths are missing", async () => {
  const emptyProjectDir = await mkdtemp(join(tmpdir(), "load-documents-"));
  testDirs.push(emptyProjectDir);

  const { loadSystemPrompt, loadSuggestionPrompt } =
    await importLoadDocumentsFrom(emptyProjectDir);
  const originalError = console.error;
  const errors = [];
  console.error = (...args) => {
    errors.push(args);
  };

  try {
    await loadSystemPrompt();
    await loadSuggestionPrompt();
  } finally {
    console.error = originalError;
  }

  const promptPathErrors = errors.filter((args) =>
    args.map(String).join(" ").includes("Prompt-Dateien nicht gefunden"),
  );

  assert.equal(promptPathErrors.length, 1);

  const message = promptPathErrors[0].map(String).join(" ");
  assert.match(message, /Prompt-Dateien nicht gefunden/);
  assert.match(message, /System-Prompt-Pfad/);
  assert.match(message, /Suggestion-Prompt-Pfad/);
  assert.match(message, /system-prompt\.md/);
  assert.match(message, /suggestion-prompt\.md/);
});
