import type { ChatRequestDiagnostic } from "./rag/types";

const MAX_HISTORY = 50;

let diagnostics: ChatRequestDiagnostic[] = [];

export function addDiagnostic(d: ChatRequestDiagnostic): void {
  diagnostics = [d, ...diagnostics].slice(0, MAX_HISTORY);
}

export function getAllDiagnostics(): ChatRequestDiagnostic[] {
  return diagnostics;
}

export function getLastDiagnostic(): ChatRequestDiagnostic | null {
  return diagnostics[0] ?? null;
}

export function clearDiagnostics(): void {
  diagnostics = [];
}
