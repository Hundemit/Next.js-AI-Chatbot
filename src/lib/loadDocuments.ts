import { readFile, readdir } from "fs/promises";
import { join } from "path";

import { logger } from "./logger.ts";
import { RAG_CONFIG } from "./rag/config.ts";
import type { SearchResult } from "./rag/types.ts";

const DATA_DIR = join(process.cwd(), "src", "data", "system-messages");
// Fallback documents are the indexed knowledge base. When RAG is unavailable we
// read these markdown files directly so the model still has the source content.
const DOCUMENTS_DIR = RAG_CONFIG.knowledgeBasePath;
const SYSTEM_PROMPT_PATH = join(DATA_DIR, "system-prompt.md");
const SUGGESTION_PROMPT_PATH = join(DATA_DIR, "suggestion-prompt.md");

const missingPromptPaths = new Set<string>();
let missingPromptPathsErrorLogged = false;

function reportMissingPromptPath(filePath: string): void {
  missingPromptPaths.add(filePath);

  const bothPromptsMissing =
    missingPromptPaths.has(SYSTEM_PROMPT_PATH) &&
    missingPromptPaths.has(SUGGESTION_PROMPT_PATH);

  if (missingPromptPathsErrorLogged || !bothPromptsMissing) {
    return;
  }

  missingPromptPathsErrorLogged = true;
  logger.error(
    "Prompt-Dateien nicht gefunden. System-Prompt-Pfad:",
    SYSTEM_PROMPT_PATH,
    "Suggestion-Prompt-Pfad:",
    SUGGESTION_PROMPT_PATH,
  );
}

/**
 * Loads the system prompt from the system-prompt.md file.
 * @returns The system prompt as a string, or null if the file does not exist.
 */
export async function loadSystemPrompt(): Promise<string | null> {
  try {
    const content = await readFile(SYSTEM_PROMPT_PATH, "utf-8");
    return content.trim();
  } catch {
    logger.warn("System prompt file not found:", SYSTEM_PROMPT_PATH);
    reportMissingPromptPath(SYSTEM_PROMPT_PATH);
    return null;
  }
}

/**
 * Loads the suggestion prompt from the suggestion-prompt.md file.
 * @returns The suggestion prompt as a string.
 */
export async function loadSuggestionPrompt(): Promise<string> {
  const details = await loadSuggestionPromptDetails();
  return details.prompt;
}

export async function loadSuggestionPromptDetails(): Promise<{
  prompt: string;
  source: string;
  loadedFromFile: boolean;
}> {
  try {
    const content = await readFile(SUGGESTION_PROMPT_PATH, "utf-8");
    return {
      prompt: content.trim(),
      source: "src/data/system-messages/suggestion-prompt.md",
      loadedFromFile: true,
    };
  } catch {
    logger.warn(
      "Suggestion prompt file not found:",
      SUGGESTION_PROMPT_PATH,
    );
    reportMissingPromptPath(SUGGESTION_PROMPT_PATH);
    return {
      prompt: "No suggestion prompt found",
      source: "built-in fallback",
      loadedFromFile: false,
    };
  }
}

/**
 * Loads a single document from the documents folder.
 * @param filename The filename (e.g. "faq.md")
 * @returns The file content as a string, or null if the file does not exist.
 */
export async function loadDocument(filename: string): Promise<string | null> {
  try {
    const filePath = join(DOCUMENTS_DIR, filename);
    const content = await readFile(filePath, "utf-8");
    return content.trim();
  } catch {
    logger.warn(`Document not found: ${filename}`);
    return null;
  }
}

/**
 * Loads all documents from the documents folder.
 * @returns An object with filenames as keys and contents as values.
 */
export async function loadAllDocuments(): Promise<Record<string, string>> {
  try {
    const files = await readdir(DOCUMENTS_DIR);
    const documents: Record<string, string> = {};

    for (const file of files) {
      // Skip hidden files and non-markdown/text files
      if (file.startsWith(".")) continue;
      if (!file.match(/\.(md|txt)$/i)) continue;

      const content = await loadDocument(file);
      if (content) {
        documents[file] = content;
      }
    }



    return documents;
  } catch {
    logger.warn("Documents folder not found:", DOCUMENTS_DIR);
    return {};
  }
}

/**
 * Combines system prompt and documents into a full context.
 * @param includeDocuments Whether to include documents.
 * @returns The combined context as a string.
 */
export async function loadFullContext(
  includeDocuments: boolean = true,
): Promise<string> {
  const parts: string[] = [];

  // Load system prompt
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  // Load and append documents
  if (includeDocuments) {
    const documents = await loadAllDocuments();
    const documentEntries = Object.entries(documents);

    if (documentEntries.length > 0) {
      parts.push("\n\n## Verfügbare Informationen:\n");
      documentEntries.forEach(([filename, content]) => {
        parts.push(`\n### ${filename}\n\n${content}\n`);
      });
    }
  }

  return parts.join("\n");
}

/**
 * Loads relevant context based on the user query (RAG).
 * @param userQuery The user's query.
 * @returns The combined context with system prompt and relevant chunks.
 */
export async function loadRelevantContext(userQuery: string): Promise<string> {
  const details = await loadRelevantContextDetails(userQuery);
  return details.context;
}

export interface RelevantContextDetails {
  context: string;
  systemPromptIncluded: boolean;
  ragContext: string;
  ragContextTokens: number;
  results: SearchResult[];
  usedChunkIds: string[];
  fallbackReason: string | null;
}

export async function loadRelevantContextDetails(
  userQuery: string,
): Promise<RelevantContextDetails> {
  const parts: string[] = [];

  // Load system prompt
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  try {
    const { loadRelevantContext: loadRAGContext } = await import("./rag/index");
    const ragContext = await loadRAGContext(userQuery);

    if (ragContext.context) {
      parts.push("\n\n");
      parts.push(ragContext.context);
    }

    return {
      context: parts.join("\n"),
      systemPromptIncluded: Boolean(systemPrompt),
      ragContext: ragContext.context,
      ragContextTokens: ragContext.tokenCount,
      results: ragContext.results,
      usedChunkIds: ragContext.usedChunkIds,
      fallbackReason: null,
    };
  } catch (error) {
    logger.warn(
      "RAG unavailable, falling back to standard documents:",
      error,
    );
    const documents = await loadAllDocuments();
    const documentEntries = Object.entries(documents);

    if (documentEntries.length > 0) {
      parts.push("\n\n## Verfügbare Informationen:\n");
      documentEntries.forEach(([filename, content]) => {
        parts.push(`\n### ${filename}\n\n${content}\n`);
      });
    }

    return {
      context: parts.join("\n"),
      systemPromptIncluded: Boolean(systemPrompt),
      ragContext: "",
      ragContextTokens: 0,
      results: [],
      usedChunkIds: [],
      fallbackReason:
        error instanceof Error ? error.message : "Unknown RAG error",
    };
  }
}
