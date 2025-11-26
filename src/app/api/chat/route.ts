import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";

import { extractTextFromMessage } from "@/lib/chatUtils";
import { loadRelevantContext, loadFullContext } from "@/lib/loadDocuments";
import { initializeKnowledgeBase } from "@/lib/rag/index";

// Allow streaming responses up to 30 seconds
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
  const { messages, model }: { messages: UIMessage[]; model?: string } =
    await req.json();

  // Also log the incoming messages for inspection
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("OPENROUTER_API_KEY is not set", { status: 500 });
  }

  // Default model if none provided
  const selectedModel = model || "google/gemini-2.5-flash-lite";

  // Extrahiere User-Query aus den Messages (letzte User-Message)
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
      // Fallback auf Standard-Methode wenn keine Query
      systemContext = await loadFullContext(true);
    }
  } catch (error) {
    console.warn("Fehler beim Laden des Kontexts, Fallback:", error);
    // Fallback auf Standard-Methode
    systemContext = await loadFullContext(true);
  }

  const result = streamText({
    model: openrouter.chat(selectedModel),
    system: systemContext || undefined,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
