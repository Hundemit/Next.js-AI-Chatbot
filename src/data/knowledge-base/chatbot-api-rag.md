# Chatbot API-Routes und RAG-System

## API-Routes Übersicht

Der Chatbot verwendet zwei API-Endpunkte:

| Endpunkt | Methode | Zweck |
|----------|---------|-------|
| `/api/chat` | POST | Haupt-Chat mit RAG-Integration |
| `/api/suggestions` | POST | Generiert Folgefragen |

---

## 1. Chat API Route

**Pfad:** `src/app/api/chat/route.ts`

### Vollständiger Code

```typescript
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { extractTextFromMessage } from "@/lib/chatUtils";
import { loadRelevantContext, loadFullContext } from "@/lib/loadDocuments";
import { initializeKnowledgeBase } from "@/lib/rag/index";

// Streaming bis zu 30 Sekunden erlauben
export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// Initialisiere Knowledge Base beim ersten Start (nicht-blockierend)
let initPromise: Promise<void> | null = null;
if (!initPromise) {
  initPromise = initializeKnowledgeBase().catch((error) => {
    console.warn("Knowledge Base Initialisierung fehlgeschlagen:", error);
  });
}

export async function POST(req: Request) {
  try {
    const { messages, model }: { messages: UIMessage[]; model?: string } =
      await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not set" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Warte auf Knowledge Base Initialisierung (max 5 Sekunden)
    if (initPromise) {
      try {
        await Promise.race([
          initPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Init timeout")), 5000)
          ),
        ]);
      } catch (error) {
        console.warn("Knowledge Base noch nicht initialisiert:", error);
      }
    }

    // Default Model falls keines angegeben
    const selectedModel = model || "google/gemini-2.5-flash-lite";

    // Extrahiere User-Query aus letzter User-Nachricht
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .slice(-1)[0];
    const userQuery = lastUserMessage
      ? extractTextFromMessage(lastUserMessage)
      : "";

    // Lade System-Prompt und relevante Dokumente (RAG)
    let systemContext: string;
    try {
      if (userQuery) {
        systemContext = await loadRelevantContext(userQuery);
      } else {
        systemContext = await loadFullContext(true);
      }
    } catch (error) {
      console.warn("Fehler beim Laden des Kontexts:", error);
      systemContext = await loadFullContext(true);
    }

    // Stream Response
    const result = streamText({
      model: openrouter.chat(selectedModel),
      system: systemContext || undefined,
      messages: convertToModelMessages(messages),
      onFinish: (result) => {
        console.log("Chat completion:", {
          finishReason: result.finishReason,
          usage: result.usage,
        });
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Error in chat API route:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### Request Format

```typescript
// POST /api/chat
{
  messages: UIMessage[];  // Array von Chat-Nachrichten
  model?: string;         // Optional: Model-ID (z.B. "google/gemini-2.5-flash-lite")
}

// UIMessage Struktur (vom AI SDK)
interface UIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  parts: Array<{
    type: "text";
    text: string;
  }>;
}
```

### Response Format

Server-Sent Events (SSE) Stream mit chunks der AI-Antwort.

### Verarbeitungsschritte

1. **Validierung:** Prüft ob `OPENROUTER_API_KEY` gesetzt ist
2. **Init-Warten:** Wartet max 5s auf Knowledge Base Initialisierung
3. **Query-Extraktion:** Holt Text aus letzter User-Nachricht
4. **RAG-Kontext:** Lädt relevante Chunks oder Fallback
5. **LLM-Aufruf:** Streamt Antwort via OpenRouter
6. **Response:** Gibt SSE-Stream zurück

---

## 2. Suggestions API Route

**Pfad:** `src/app/api/suggestions/route.ts`

### Vollständiger Code

```typescript
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { z } from "zod";

import { loadSuggestionPrompt } from "@/lib/loadDocuments";

export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { messages, model }: { messages: UIMessage[]; model?: string } =
      await req.json();

    if (!process.env.OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: "OPENROUTER_API_KEY is not set" }),
        { status: 500 }
      );
    }

    const selectedModel = model || "google/gemini-2.5-flash-lite";
    const modelMessages = convertToModelMessages(messages);
    const suggestionPrompt = await loadSuggestionPrompt();

    // Generiere Suggestions mit Schema-Validierung
    const result = await generateObject({
      model: openrouter.chat(selectedModel),
      system: suggestionPrompt,
      messages: [
        ...modelMessages,
        {
          role: "user" as const,
          content:
            "Generiere basierend auf der letzten Antwort des Assistenten 3-5 relevante Folgefragen.",
        },
      ],
      schema: z.object({
        suggestions: z.array(z.string()),
      }),
    });

    const suggestions = (result.object.suggestions || []).slice(0, 5);
    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
    });
  }
}
```

### Request/Response Format

```typescript
// Request
{
  messages: UIMessage[];
  model?: string;
}

// Response
{
  suggestions: string[];  // Array von 3-5 Folgefragen
}
```

---

## RAG-System (Retrieval Augmented Generation)

### Übersicht

Das RAG-System ermöglicht kontextbezogene Antworten basierend auf der Knowledge Base. Es besteht aus:

1. **Indexierung:** Dokumente → Chunks → Embeddings → Vector Store
2. **Retrieval:** Query → Embedding → Ähnlichkeitssuche → Relevante Chunks
3. **Augmentation:** System-Prompt + Relevante Chunks → LLM

### Dateien

| Datei | Zweck |
|-------|-------|
| `src/lib/rag/index.ts` | Haupt-RAG-Logik |
| `src/lib/rag/config.ts` | Konfiguration |
| `src/lib/rag/chunker.ts` | Text-Chunking |
| `src/lib/rag/parsers.ts` | Datei-Parser |
| `src/lib/rag/types.ts` | TypeScript Types |
| `src/lib/rag/vectorStore.ts` | Vector Store |

---

## RAG Konfiguration

**Pfad:** `src/lib/rag/config.ts`

```typescript
export const RAG_CONFIG = {
  // Pfad zur Knowledge Base
  knowledgeBasePath: join(process.cwd(), "src", "data", "knowledge-base"),

  // Unterstützte Dateiformate
  supportedFormats: [".pdf", ".docx", ".txt", ".md", ".json", ".csv"],

  // Chunking-Einstellungen
  chunkTokens: 512,           // Tokens pro Chunk
  chunkOverlapTokens: 32,     // Überlappung zwischen Chunks

  // Suche-Einstellungen
  topK: 20,                   // Anzahl zurückgegebener Chunks
  minSimilarity: 0.3,         // Minimale Cosine Similarity (0.0-1.0)

  // Cache-Pfad für Index
  cachePath: process.env.VERCEL
    ? "/tmp/rag-index.json"
    : join(process.cwd(), ".next", "cache", "rag-index.json"),

  // Embedding-Einstellungen
  embeddingBatchSize: 16,     // Chunks pro Batch
  maxFileSizeMB: 50,          // Max Dateigröße

  // Zukünftige Features
  enableOCR: false,
  piiRedaction: false,
  vectorStore: "file" as const,
};
```

### Konfiguration anpassen

- **minSimilarity senken:** Mehr Ergebnisse, aber möglicherweise weniger relevant
- **topK erhöhen:** Mehr Kontext für LLM
- **chunkTokens:** Größere Chunks = mehr Kontext pro Chunk

---

## RAG Index Initialisierung

**Pfad:** `src/lib/rag/index.ts`

### initializeKnowledgeBase()

```typescript
export async function initializeKnowledgeBase(
  forceReindex: boolean = false
): Promise<void> {
  // Verhindere parallele Indizierung
  if (indexingPromise) {
    await indexingPromise;
    return;
  }

  indexingPromise = indexKnowledgeBase(forceReindex);
  await indexingPromise;
  indexingPromise = null;
}
```

### indexKnowledgeBase()

```typescript
export async function indexKnowledgeBase(
  forceReindex: boolean = false
): Promise<{ indexed: number; skipped: number; errors: number }> {
  const vectorStore = new FileVectorStore();

  // 1. Prüfe ob Knowledge Base Ordner existiert
  if (!existsSync(knowledgeBasePath)) {
    return { indexed: 0, skipped: 0, errors: 0 };
  }

  // 2. Lade existierenden Index
  await vectorStore.loadIndex();

  // 3. Lese alle unterstützten Dateien
  const allEntries = await readdir(knowledgeBasePath, { recursive: true });
  const supportedFiles = allEntries.filter(
    (file) => isSupportedFile(file) && !file.startsWith(".")
  );

  // 4. Für jede Datei
  for (const file of supportedFiles) {
    const fileHash = await calculateFileHash(filePath);

    // Prüfe ob Re-Indexing nötig
    if (!forceReindex && fileInfo?.fileHash === fileHash) {
      skipped++;
      continue;
    }

    // Parse Datei
    const text = await parseFile(filePath);

    // Chunke Text
    const chunks = chunkByFileType(text, relativePath, metadata);

    // Sammle für Batch-Embedding
    chunksToEmbed.push(...chunks);
  }

  // 5. Generiere Embeddings in Batches
  for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
    const batch = chunksToEmbed.slice(i, i + batchSize);
    const embeddings = await getEmbeddings(batch.map((b) => b.text));
    await vectorStore.addChunks(chunksWithEmbeddings);
  }

  return { indexed, skipped, errors };
}
```

---

## Text Chunking

**Pfad:** `src/lib/rag/chunker.ts`

### Token-basiertes Chunking

```typescript
export function chunkText(
  text: string,
  source: string,
  metadata: { fileType: string; filePath: string; fileHash: string; mtime: number }
): Chunk[] {
  const ENCODING = encodingForModel("gpt-4");
  const tokens = ENCODING.encode(text);

  // Text passt in einen Chunk
  if (tokens.length <= RAG_CONFIG.chunkTokens) {
    return [{
      id: `${source}-0`,
      text,
      source,
      chunkIndex: 0,
      metadata: { ...metadata, totalChunks: 1 },
    }];
  }

  // Intelligentes Chunking mit Overlap
  const chunks: Chunk[] = [];
  let startIndex = 0;
  let chunkIndex = 0;

  while (startIndex < tokens.length) {
    const endIndex = Math.min(startIndex + RAG_CONFIG.chunkTokens, tokens.length);
    const chunkTokens = tokens.slice(startIndex, endIndex);
    const chunkText = ENCODING.decode(chunkTokens);

    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: chunkText,
      source,
      chunkIndex,
      metadata: { ...metadata, totalChunks: Math.ceil(tokens.length / RAG_CONFIG.chunkTokens) },
    });

    // Nächster Chunk mit Overlap
    startIndex = endIndex - RAG_CONFIG.chunkOverlapTokens;
    chunkIndex++;
  }

  return chunks;
}
```

### Code-Chunking (Zeilenbasiert)

```typescript
export function chunkCode(text: string, source: string, metadata: {...}): Chunk[] {
  const lines = text.split("\n");
  const chunks: Chunk[] = [];
  let currentChunk: string[] = [];
  let currentTokens = 0;

  for (const line of lines) {
    const lineTokens = ENCODING.encode(line).length;

    if (currentTokens + lineTokens > RAG_CONFIG.chunkTokens) {
      // Speichere aktuellen Chunk
      chunks.push({...});

      // Overlap: Behalte letzte Zeilen
      const overlapLines = Math.floor(
        (RAG_CONFIG.chunkOverlapTokens / RAG_CONFIG.chunkTokens) * currentChunk.length
      );
      currentChunk = currentChunk.slice(-overlapLines);
    }

    currentChunk.push(line);
    currentTokens += lineTokens;
  }

  return chunks;
}
```

### Automatische Strategie-Wahl

```typescript
export function chunkByFileType(text: string, source: string, metadata: {...}): Chunk[] {
  const codeExtensions = [".ts", ".tsx", ".js", ".jsx", ".py", ".java", ".go"];

  if (codeExtensions.some((ext) => metadata.filePath.endsWith(ext))) {
    return chunkCode(text, source, metadata);
  }

  return chunkText(text, source, metadata);
}
```

---

## Embedding Generierung

**Pfad:** `src/lib/rag/index.ts`

```typescript
const EMBEDDING_MODEL = "text-embedding-3-small";

async function getEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings: number[][] = [];

  for (const text of texts) {
    const response = await fetch(
      "https://openrouter.ai/api/v1/embeddings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: text,
        }),
      }
    );

    const data = await response.json();
    embeddings.push(data.data[0]?.embedding || []);
  }

  return embeddings;
}
```

---

## Vector Store

**Pfad:** `src/lib/rag/vectorStore.ts`

### FileVectorStore Klasse

```typescript
export class FileVectorStore implements IVectorStore {
  private index: VectorStoreIndex | null = null;
  private indexPath: string;

  constructor(cachePath: string = RAG_CONFIG.cachePath) {
    this.indexPath = cachePath;
  }

  // Cosine Similarity berechnen
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  // Ähnliche Chunks suchen
  async search(
    queryEmbedding: number[],
    options: { topK: number; minSimilarity?: number }
  ): Promise<SearchResult[]> {
    const index = await this.loadIndex();
    if (!index) return [];

    const results: SearchResult[] = [];

    for (const chunk of index.chunks) {
      if (!chunk.embedding) continue;

      const similarity = this.cosineSimilarity(queryEmbedding, chunk.embedding);

      if (similarity >= (options.minSimilarity ?? RAG_CONFIG.minSimilarity)) {
        results.push({ chunk, score: similarity });
      }
    }

    // Sortiere nach Score (höchste zuerst)
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, options.topK);
  }
}
```

### Index-Struktur

```typescript
interface VectorStoreIndex {
  version: string;
  chunks: Chunk[];
  fileIndex: Record<string, FileIndexEntry>;
  createdAt: number;
  updatedAt: number;
}

interface Chunk {
  id: string;
  text: string;
  embedding?: number[];
  source: string;
  chunkIndex: number;
  metadata: ChunkMetadata;
}

interface ChunkMetadata {
  fileType: string;
  filePath: string;
  fileHash: string;
  mtime: number;
  totalChunks: number;
}
```

---

## Relevanten Kontext laden

**Pfad:** `src/lib/rag/index.ts`

### searchRelevantChunks()

```typescript
export async function searchRelevantChunks(
  query: string,
  topK: number = RAG_CONFIG.topK
): Promise<Array<{ chunk: Chunk; score: number }>> {
  const vectorStore = new FileVectorStore();

  // Generiere Query-Embedding
  const queryEmbedding = await getEmbedding(query);
  if (queryEmbedding.length === 0) return [];

  // Lade Index
  const index = await vectorStore.loadIndex();
  if (!index || index.chunks.length === 0) {
    // Starte Indizierung im Hintergrund
    initializeKnowledgeBase().catch(console.warn);
    return [];
  }

  // Suche ähnliche Chunks
  return await vectorStore.search(queryEmbedding, {
    topK,
    minSimilarity: RAG_CONFIG.minSimilarity,
  });
}
```

### loadRelevantContext()

```typescript
export async function loadRelevantContext(
  userQuery: string
): Promise<RelevantContext> {
  const results = await searchRelevantChunks(userQuery);

  if (results.length === 0) {
    return { context: "", sources: [] };
  }

  // Begrenze Gesamt-Token-Anzahl
  const maxContextTokens = 2000;
  let currentTokens = 0;
  const chunks: string[] = [];
  const sources: SourceInfo[] = [];

  for (const result of results) {
    const chunkTokens = ENCODING.encode(result.chunk.text).length;

    if (currentTokens + chunkTokens > maxContextTokens) break;

    chunks.push(result.chunk.text);
    sources.push({
      file: result.chunk.source,
      chunkIndex: result.chunk.chunkIndex,
      score: result.score,
    });

    currentTokens += chunkTokens;
  }

  // Formatiere Kontext
  const contextParts = ["## Verfügbare Informationen:\n"];

  chunks.forEach((chunkText, idx) => {
    const source = sources[idx];
    contextParts.push(
      `\n### ${source.file} (Chunk ${source.chunkIndex}, Relevanz: ${source.score.toFixed(2)})\n\n${chunkText}\n`
    );
  });

  return {
    context: contextParts.join("\n"),
    sources,
  };
}
```

---

## Document Loader

**Pfad:** `src/lib/loadDocuments.ts`

### loadFullContext() (Fallback ohne RAG)

```typescript
export async function loadFullContext(
  includeDocuments: boolean = true
): Promise<string> {
  const parts: string[] = [];

  // System-Prompt laden
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) parts.push(systemPrompt);

  // Dokumente laden
  if (includeDocuments) {
    const documents = await loadAllDocuments();
    if (Object.keys(documents).length > 0) {
      parts.push("\n\n## Verfügbare Informationen:\n");
      Object.entries(documents).forEach(([filename, content]) => {
        parts.push(`\n### ${filename}\n\n${content}\n`);
      });
    }
  }

  return parts.join("\n");
}
```

### loadRelevantContext() (mit RAG)

```typescript
export async function loadRelevantContext(userQuery: string): Promise<string> {
  const parts: string[] = [];

  // System-Prompt laden
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) parts.push(systemPrompt);

  try {
    // RAG-Kontext laden
    const { loadRelevantContext: loadRAGContext } = await import("./rag/index");
    const ragContext = await loadRAGContext(userQuery);

    if (ragContext.context) {
      parts.push("\n\n");
      parts.push(ragContext.context);
    }
  } catch (error) {
    // Fallback auf Standard-Dokumente
    const documents = await loadAllDocuments();
    // ...
  }

  return parts.join("\n");
}
```

---

## useSuggestions Hook

**Pfad:** `src/hooks/useSuggestions.ts`

```typescript
export function useSuggestions({
  messages,
  status,
  selectedModel,
}: UseSuggestionsParams): UseSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [stopped, setStopped] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Reset-Funktion
  const reset = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setSuggestions([]);
    setIsLoading(false);
    setStopped(false);
  }, []);

  // Stop-Funktion
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setStopped(true);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // Laden wenn:
    // - Nachrichten vorhanden
    // - Status nicht "submitted" oder "streaming"
    // - Nicht gestoppt
    // - Letzte Nachricht ist vom Assistant
    // - User hat bereits geschrieben

    const loadSuggestions = async () => {
      // ... Validierungen ...

      setIsLoading(true);
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const response = await fetch("/api/suggestions", {
        method: "POST",
        body: JSON.stringify({ messages, model: selectedModel }),
        signal: abortController.signal,
      });

      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.suggestions || []);
      }

      setIsLoading(false);
    };

    // Debounce: 500ms
    const timeoutId = setTimeout(loadSuggestions, 500);

    return () => {
      clearTimeout(timeoutId);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [messages, status, stopped, selectedModel]);

  return { suggestions, isLoading, reset, stop, stopped };
}
```

---

## Fehlerbehandlung

### API-Route Fehler

```typescript
// In route.ts
catch (error) {
  console.error("Error:", error);
  return new Response(
    JSON.stringify({
      error: error instanceof Error ? error.message : "Unknown error",
      details: process.env.NODE_ENV === "development" ? errorStack : undefined,
    }),
    { status: 500 }
  );
}
```

### Client-seitige Fehler

```typescript
// In ChatContext.tsx
const addErrorMessage = useCallback(
  (error: unknown) => {
    console.error("Chat Error:", error);
    setMessages((prevMessages) => [
      ...prevMessages,
      {
        id: nanoid(),
        role: "assistant",
        parts: [{ type: "text", text: formatErrorMessage(error) }],
      },
    ]);
    setIsChatbotTyping(false);
  },
  [setMessages]
);
```

---

## Reindex API Route

**Pfad:** `src/app/api/rag/reindex/route.ts`

Diese Route ermöglicht manuelles Re-Indexing:

```typescript
export async function POST(req: Request) {
  const { force } = await req.json();

  const result = await indexKnowledgeBase(force ?? false);

  return new Response(JSON.stringify({
    success: true,
    indexed: result.indexed,
    skipped: result.skipped,
    errors: result.errors,
  }));
}
```

Aufruf:

```bash
curl -X POST http://localhost:3000/api/rag/reindex \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

