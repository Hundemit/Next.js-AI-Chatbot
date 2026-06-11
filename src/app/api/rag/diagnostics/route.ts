import { createIndexDiagnostic } from "@/lib/rag/diagnostics";
import { FileVectorStore } from "@/lib/rag/vectorStore";

export async function GET() {
  try {
    const vectorStore = new FileVectorStore();
    const index = await vectorStore.loadIndex();

    return Response.json(createIndexDiagnostic(index));
  } catch (error) {
    console.error("Fehler beim Abrufen der RAG-Diagnose:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
