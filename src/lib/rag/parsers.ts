import { readFile, stat } from "fs/promises";
import mammoth from "mammoth";
import { extname } from "path";
import PDFParser from "pdf2json";

import { RAG_CONFIG } from "./config";

/**
 * Parsers for various file types.
 */

/**
 * Checks whether a file exceeds the size limit.
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
 * Parses a PDF file to text.
 */
export async function parsePDF(filePath: string): Promise<string> {
  if (!(await checkFileSize(filePath))) {
    throw new Error(
      `File too large: ${filePath} (max ${RAG_CONFIG.maxFileSizeMB}MB)`,
    );
  }

  try {
    // Read the PDF file as buffer
    const dataBuffer = await readFile(filePath);

    // Promise-based wrapper for pdf2json
    return new Promise<string>((resolve, reject) => {
      const pdfParser = new PDFParser(null, true);

      pdfParser.on("pdfParser_dataError", (errData: unknown) => {
        const error =
          errData && typeof errData === "object" && "parserError" in errData
            ? errData.parserError
            : errData;
        console.error("PDF Parsing Error:", error);
        reject(new Error(`PDF parsing error: ${error}`));
      });

      pdfParser.on("pdfParser_dataReady", () => {
        try {
          const parsedText = pdfParser.getRawTextContent();
          resolve(parsedText || "");
        } catch (error) {
          reject(new Error(`Error extracting text: ${error}`));
        }
      });

      // Load PDF from buffer
      pdfParser.parseBuffer(dataBuffer);
    });
  } catch (error) {
    console.error(`PDF parsing error for ${filePath}:`, error);
    throw new Error(`Error parsing PDF: ${filePath} - ${error}`);
  }
}

/**
 * Parses a DOCX file to text.
 */
export async function parseDOCX(filePath: string): Promise<string> {
  if (!(await checkFileSize(filePath))) {
    throw new Error(
      `File too large: ${filePath} (max ${RAG_CONFIG.maxFileSizeMB}MB)`,
    );
  }

  try {
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  } catch (error) {
    throw new Error(`Error parsing DOCX: ${filePath} - ${error}`);
  }
}

/**
 * Parses text files (TXT, MD, etc.).
 */
export async function parseText(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    return content;
  } catch (error) {
    throw new Error(`Error reading text file: ${filePath} - ${error}`);
  }
}

/**
 * Parses JSON files.
 */
export async function parseJSON(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);

    // Convert JSON to readable text
    if (typeof json === "object") {
      return JSON.stringify(json, null, 2);
    }

    return String(json);
  } catch (error) {
    throw new Error(`Error parsing JSON: ${filePath} - ${error}`);
  }
}

/**
 * Parses CSV files.
 */
export async function parseCSV(filePath: string): Promise<string> {
  try {
    const content = await readFile(filePath, "utf-8");
    const lines = content.split("\n");

    // Simple CSV-to-text conversion
    return lines
      .map((line, index) => {
        if (index === 0) {
          return `Spalten: ${line}`;
        }
        return `Zeile ${index}: ${line}`;
      })
      .join("\n");
  } catch (error) {
    throw new Error(`Error parsing CSV: ${filePath} - ${error}`);
  }
}

/**
 * Parses a file based on its extension.
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
        throw new Error(`Unsupported file type: ${ext}`);
      }
  }
}
