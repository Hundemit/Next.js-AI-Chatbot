import { readFile, stat } from "fs/promises";
import mammoth from "mammoth";
import { extname } from "path";
import PDFParser from "pdf2json";

import { RAG_CONFIG } from "./config";

/**
 * Parser für verschiedene Dateitypen
 */

/**
 * Prüft ob Datei zu groß ist
 */
async function checkFileSize(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    const sizeMB = stats.size / (1024 * 1024);
    return sizeMB <= RAG_CONFIG.maxFileSizeMB;
  } catch {
    return false;
  }
}

/**
 * Parst PDF zu Text
 */
export async function parsePDF(filePath: string): Promise<string> {
  if (!(await checkFileSize(filePath))) {
    throw new Error(
      `Datei zu groß: ${filePath} (max ${RAG_CONFIG.maxFileSizeMB}MB)`,
    );
  }

  try {
    // Lese die PDF-Datei als Buffer
    const dataBuffer = await readFile(filePath);

    // Erstelle Promise-basierte Wrapper für pdf2json
    return new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);

      pdfParser.on("pdfParser_dataError", (errData: unknown) => {
        const error =
          errData && typeof errData === "object" && "parserError" in errData
            ? errData.parserError
            : errData;
        console.error("PDF Parsing Error:", error);
        reject(new Error(`PDF-Parsing Fehler: ${error}`));
      });

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          const parsedText = pdfParser.getRawTextContent();
          resolve(parsedText || "");
        } catch (error) {
          reject(new Error(`Fehler beim Extrahieren des Textes: ${error}`));
        }
      });

      // Lade PDF aus Buffer
      pdfParser.parseBuffer(dataBuffer);
    });
  } catch (error) {
    console.error(`PDF-Parsing Fehler für ${filePath}:`, error);
    throw new Error(`Fehler beim Parsen von PDF: ${filePath} - ${error}`);
  }
}

/**
 * Parst DOCX zu Text
 */
export async function parseDOCX(filePath: string): Promise<string> {
  if (!(await checkFileSize(filePath))) {
    throw new Error(
      `Datei zu groß: ${filePath} (max ${RAG_CONFIG.maxFileSizeMB}MB)`,
    );
  }

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Fehler beim Parsen von DOCX: ${filePath} - ${error}`);
  }
}

/**
 * Parst Text-Dateien (TXT, MD, etc.)
 */
export async function parseText(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Fehler beim Lesen von Text-Datei: ${filePath} - ${error}`);
  }
}

/**
 * Parst JSON-Dateien
 */
export async function parseJSON(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);

    // Konvertiere JSON zu lesbarem Text
    if (typeof json === "object") {
      return JSON.stringify(json, null, 2);
    }

    return String(json);
  } catch (error) {
    throw new Error(`Fehler beim Parsen von JSON: ${filePath} - ${error}`);
  }
}

/**
 * Parst CSV-Dateien
 */
export async function parseCSV(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Einfache CSV-zu-Text Konvertierung
    return lines
      .map((line, index) => {
        if (index === 0) {
          return `Spalten: ${line}`;
        }
        return `Zeile ${index}: ${line}`;
      })
      .join("\n");
  } catch (error) {
    throw new Error(`Fehler beim Parsen von CSV: ${filePath} - ${error}`);
  }
}

/**
 * Parst eine Datei basierend auf ihrem Dateityp
 */
export async function parseFile(filePath: string): Promise<string> {
  const ext = extname(filePath).toLowerCase();

  switch (ext) {
    case ".pdf":
      return parsePDF(filePath);
    case ".docx":
      return parseDOCX(filePath);
    case ".txt":
    case ".md":
      return parseText(filePath);
    case ".json":
      return parseJSON(filePath);
    case ".csv":
      return parseCSV(filePath);
    default:
      // Fallback: Versuche als Text zu lesen
      try {
        return parseText(filePath);
      } catch {
        throw new Error(`Nicht unterstützter Dateityp: ${ext}`);
      }
  }
}
