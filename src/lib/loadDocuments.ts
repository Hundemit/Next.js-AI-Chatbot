import { readFile, readdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), "src", "data");
const DOCUMENTS_DIR = join(DATA_DIR, "documents");
const SYSTEM_PROMPT_PATH = join(DATA_DIR, "system-prompt.txt");

/**
 * Lädt den System-Prompt aus der system-prompt.txt Datei
 * @returns Der System-Prompt als String, oder null falls die Datei nicht existiert
 */
export async function loadSystemPrompt(): Promise<string | null> {
  try {
    const content = await readFile(SYSTEM_PROMPT_PATH, "utf-8");
    return content.trim();
  } catch (error) {
    console.warn("System-Prompt Datei nicht gefunden:", SYSTEM_PROMPT_PATH);
    return null;
  }
}

/**
 * Lädt ein einzelnes Dokument aus dem documents Ordner
 * @param filename Der Name der Datei (z.B. "faq.md")
 * @returns Der Inhalt der Datei als String, oder null falls die Datei nicht existiert
 */
export async function loadDocument(filename: string): Promise<string | null> {
  try {
    const filePath = join(DOCUMENTS_DIR, filename);
    const content = await readFile(filePath, "utf-8");
    return content.trim();
  } catch (error) {
    console.warn(`Dokument nicht gefunden: ${filename}`);
    return null;
  }
}

/**
 * Lädt alle Dokumente aus dem documents Ordner
 * @returns Ein Objekt mit Dateinamen als Keys und Inhalten als Values
 */
export async function loadAllDocuments(): Promise<Record<string, string>> {
  try {
    const files = await readdir(DOCUMENTS_DIR);
    const documents: Record<string, string> = {};

    for (const file of files) {
      // Ignoriere versteckte Dateien und nur Markdown/Text-Dateien
      if (file.startsWith(".")) continue;
      if (!file.match(/\.(md|txt)$/i)) continue;

      const content = await loadDocument(file);
      if (content) {
        documents[file] = content;
      }
    }

    return documents;
  } catch (error) {
    console.warn("Documents Ordner nicht gefunden:", DOCUMENTS_DIR);
    return {};
  }
}

/**
 * Kombiniert System-Prompt und Dokumente zu einem vollständigen Kontext
 * @param includeDocuments Ob Dokumente eingeschlossen werden sollen
 * @returns Der kombinierte Kontext als String
 */
export async function loadFullContext(
  includeDocuments: boolean = true
): Promise<string> {
  const parts: string[] = [];

  // System-Prompt laden
  const systemPrompt = await loadSystemPrompt();
  if (systemPrompt) {
    parts.push(systemPrompt);
  }

  // Dokumente laden und hinzufügen
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

