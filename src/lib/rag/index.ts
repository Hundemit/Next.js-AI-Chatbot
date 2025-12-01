import { createHash } from "crypto";
import { readdir, stat } from "fs/promises";
import { encodingForModel } from "js-tiktoken";
import { extname, join, relative } from "path";

import { chunkByFileType } from "./chunker";
import { RAG_CONFIG } from "./config";
import { parseFile } from "./parsers";
import type { Chunk, RelevantContext, SourceInfo } from "./types";
import { FileVectorStore } from "./vectorStore";

/**
 * Haupt-RAG-Logik für Knowledge Base Management
 */

const ENCODING = encodingForModel("gpt-4");

// Embedding-Modell (OpenRouter unterstützt OpenAI-kompatible Embeddings)
const EMBEDDING_MODEL = "text-embedding-3-small"; // Oder ein anderes Embedding-Modell

/**
 * Berechnet SHA256 Hash einer Datei
 */
async function calculateFileHash(filePath: string): Promise<string> {
  const { readFile } = await import("fs/promises");
  const content = await readFile(filePath);
  return createHash("sha256").update(content).digest("hex");
}

/**
 * Generiert Embeddings für Texte (mit Batching)
 * Fallback auf direkte API-Calls falls embedMany nicht verfügbar
 */
async function getEmbeddings(texts: string[]): Promise<number[][]> {
  if (!process.env.OPENROUTER_API_KEY) {
    throw new Error("OPENROUTER_API_KEY is not set");
  }

  try {
    // Direkte API-Calls zu OpenRouter (OpenRouter Provider unterstützt embedding() nicht direkt)
    const embeddings: number[][] = [];

    for (const text of texts) {
      try {
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

        if (!response.ok) {
          throw new Error(`OpenRouter API error: ${response.statusText}`);
        }

        const data = await response.json();
        embeddings.push(data.data[0]?.embedding || []);
      } catch (error) {
        console.error(`Fehler beim Embedding für Text:`, error);
        embeddings.push([]);
      }
    }

    return embeddings;
  } catch (error) {
    console.error("Fehler beim Generieren von Embeddings:", error);
    // Fallback: Return leere Embeddings (wird später gefiltert)
    return texts.map(() => []);
  }
}

/**
 * Generiert ein einzelnes Embedding
 */
async function getEmbedding(text: string): Promise<number[]> {
  const embeddings = await getEmbeddings([text]);
  return embeddings[0] || [];
}

/**
 * Prüft ob eine Datei unterstützt wird
 */
function isSupportedFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return RAG_CONFIG.supportedFormats.includes(
    ext as (typeof RAG_CONFIG.supportedFormats)[number]
  );
}

/**
 * Indiziert alle Dateien aus der Knowledge Base
 */
export async function indexKnowledgeBase(
  forceReindex: boolean = false
): Promise<{ indexed: number; skipped: number; errors: number }> {
  const vectorStore = new FileVectorStore();
  const knowledgeBasePath = RAG_CONFIG.knowledgeBasePath;

  let indexed = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Prüfe ob Knowledge Base Ordner existiert
    const { existsSync } = await import("fs");
    if (!existsSync(knowledgeBasePath)) {
      console.warn(
        `Knowledge Base Ordner nicht gefunden: ${knowledgeBasePath}`
      );
      return { indexed: 0, skipped: 0, errors: 0 };
    }

    // Lade existierenden Index (für zukünftige Verwendung)
    await vectorStore.loadIndex();

    // Lese alle Einträge (Dateien und Verzeichnisse)
    const allEntries = await readdir(knowledgeBasePath, { recursive: true });
    console.log(
      `Gefundene Einträge im Knowledge Base Ordner: ${allEntries.length}`,
      allEntries.map((entry) => entry)
    );
    console.log(`Ordner: ${knowledgeBasePath}`);

    // Filtere nur Dateien (nicht Verzeichnisse) mit unterstützten Formaten
    const supportedFiles: string[] = [];
    for (const entry of allEntries) {
      const entryPath = join(knowledgeBasePath, entry);
      try {
        const stats = await stat(entryPath);
        // Nur Dateien, keine Verzeichnisse
        if (
          stats.isFile() &&
          isSupportedFile(entry) &&
          !entry.startsWith(".")
        ) {
          supportedFiles.push(entry);
        }
      } catch (error) {
        // Ignoriere Fehler beim Stat-Check (z.B. wenn Datei zwischenzeitlich gelöscht wurde)
        continue;
      }
    }

    console.log(
      `Unterstützte Dateien: ${supportedFiles.length}`,
      supportedFiles
    );

    // Batch-Processing für Embeddings
    const chunksToEmbed: { chunk: Chunk; text: string }[] = [];

    for (const file of supportedFiles) {
      const filePath = join(knowledgeBasePath, file);
      const relativePath = relative(knowledgeBasePath, filePath);

      try {
        const stats = await stat(filePath);
        const fileHash = await calculateFileHash(filePath);
        const fileInfo = vectorStore.getFileInfo(relativePath);

        // Prüfe ob Re-Indexing nötig ist
        if (
          !forceReindex &&
          fileInfo &&
          fileInfo.fileHash === fileHash &&
          fileInfo.mtime === stats.mtimeMs
        ) {
          skipped++;
          continue;
        }

        // Entferne alte Chunks dieser Datei
        await vectorStore.removeFile(relativePath);

        // Parse Datei
        const text = await parseFile(filePath);

        // Chunk Text
        const fileExt = extname(filePath).toLowerCase();
        const chunks = chunkByFileType(text, relativePath, {
          fileType: fileExt as
            | ".pdf"
            | ".docx"
            | ".txt"
            | ".md"
            | ".json"
            | ".csv",
          filePath: relativePath,
          fileHash,
          mtime: stats.mtimeMs,
        });

        // Sammle Chunks für Batch-Embedding
        for (const chunk of chunks) {
          chunksToEmbed.push({ chunk, text: chunk.text });
        }

        indexed++;
      } catch (error) {
        console.error(`Fehler beim Indizieren von ${file}:`, error);
        errors++;
      }
    }

    // Generiere Embeddings in Batches
    const batchSize = RAG_CONFIG.embeddingBatchSize;
    for (let i = 0; i < chunksToEmbed.length; i += batchSize) {
      const batch = chunksToEmbed.slice(i, i + batchSize);
      const texts = batch.map((b) => b.text);
      const embeddings = await getEmbeddings(texts);

      // Füge Embeddings zu Chunks hinzu
      const chunksWithEmbeddings = batch.map((item, idx) => ({
        ...item.chunk,
        embedding: embeddings[idx] || [],
      }));

      // Speichere Chunks
      await vectorStore.addChunks(chunksWithEmbeddings);
    }

    console.log(
      `Indizierung abgeschlossen: ${indexed} Dateien indiziert, ${skipped} übersprungen, ${errors} Fehler`
    );

    return { indexed, skipped, errors };
  } catch (error) {
    console.error("Fehler beim Indizieren der Knowledge Base:", error);
    throw error;
  }
}

/**
 * Sucht relevante Chunks basierend auf User-Query
 */
export async function searchRelevantChunks(
  query: string,
  topK: number = RAG_CONFIG.topK
): Promise<Array<{ chunk: Chunk; score: number }>> {
  const vectorStore = new FileVectorStore();

  try {
    console.log("🔍 Suche nach relevanten Chunks für Query:", query);

    // Generiere Embedding für Query
    const queryEmbedding = await getEmbedding(query);
    console.log("📊 Query Embedding generiert, Länge:", queryEmbedding.length);

    if (queryEmbedding.length === 0) {
      console.warn("⚠️ Konnte kein Embedding für Query generieren");
      return [];
    }

    // Lade Index um zu prüfen, ob Chunks vorhanden sind
    const index = await vectorStore.loadIndex();
    if (!index || index.chunks.length === 0) {
      console.warn("⚠️ Keine Chunks im Index gefunden");
      return [];
    }

    const chunksWithEmbeddings = index.chunks.filter(
      (c) => c.embedding && c.embedding.length > 0
    );
    console.log(
      `📚 Index: ${index.chunks.length} Chunks total, ${chunksWithEmbeddings.length} mit Embeddings`
    );

    if (chunksWithEmbeddings.length > 0) {
      // Prüfe Embedding-Dimensionen
      const firstChunkEmbedding = chunksWithEmbeddings[0].embedding!;
      console.log(
        `📏 Embedding-Dimensionen: Query=${queryEmbedding.length}, Chunk=${firstChunkEmbedding.length}`
      );

      if (queryEmbedding.length !== firstChunkEmbedding.length) {
        console.error(
          `❌ Embedding-Dimensionen stimmen nicht überein! Query: ${queryEmbedding.length}, Chunk: ${firstChunkEmbedding.length}`
        );
      }
    }

    // Suche ähnliche Chunks
    const results = await vectorStore.search(queryEmbedding, {
      topK,
      minSimilarity: RAG_CONFIG.minSimilarity,
    });

    console.log(
      `✅ Suche abgeschlossen: ${results.length} Ergebnisse gefunden (minSimilarity: ${RAG_CONFIG.minSimilarity})`
    );
    if (results.length > 0) {
      console.log(
        "📈 Top Ergebnisse:",
        results.map((r) => ({
          source: r.chunk.source,
          score: r.score.toFixed(4),
        }))
      );
    } else {
      console.log(
        "💡 Tipp: Versuche minSimilarity zu senken (aktuell:",
        RAG_CONFIG.minSimilarity,
        ")"
      );
    }

    return results;
  } catch (error) {
    console.error("❌ Fehler bei der Suche:", error);
    return [];
  }
}

/**
 * Lädt relevanten Kontext basierend auf User-Query
 */
export async function loadRelevantContext(
  userQuery: string
): Promise<RelevantContext> {
  try {
    // Search relevant chunks
    const results = await searchRelevantChunks(userQuery);
    console.log("=========================================");
    console.log(
      "searchRelevantChunks Results:",
      results.map((r) => r.chunk.id)
    );
    console.log("=========================================");
    if (results.length === 0) {
      return {
        context: "",
        sources: [],
      };
    }

    // Kombiniere Chunks zu Kontext
    const chunks: string[] = [];
    const sources: SourceInfo[] = [];

    // Begrenze Gesamt-Token-Anzahl (ca. 2000 Tokens für Kontext, Rest für Prompt)
    const maxContextTokens = 2000;
    let currentTokens = 0;

    for (const result of results) {
      const chunkTokens = ENCODING.encode(result.chunk.text).length;

      if (currentTokens + chunkTokens > maxContextTokens) {
        break;
      }

      chunks.push(result.chunk.text);
      sources.push({
        file: result.chunk.source,
        chunkIndex: result.chunk.chunkIndex,
        score: result.score,
      });

      currentTokens += chunkTokens;
    }

    // Formatiere Kontext mit Source-Attribution
    const contextParts: string[] = [];

    if (chunks.length > 0) {
      contextParts.push("## Verfügbare Informationen:\n");

      chunks.forEach((chunkText, idx) => {
        const source = sources[idx];
        contextParts.push(
          `\n### ${source.file} (Chunk ${
            source.chunkIndex
          }, Relevanz: ${source.score.toFixed(2)})\n\n${chunkText}\n`
        );
      });
    }

    return {
      context: contextParts.join("\n"),
      sources,
    };
  } catch (error) {
    console.error("Fehler beim Laden des relevanten Kontexts:", error);
    return {
      context: "",
      sources: [],
    };
  }
}

/**
 * Initialisiert die Knowledge Base (wird beim Start aufgerufen)
 */
let indexingPromise: Promise<{
  indexed: number;
  skipped: number;
  errors: number;
}> | null = null;

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
