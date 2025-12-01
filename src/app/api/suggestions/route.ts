import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, generateObject, type UIMessage } from "ai";
import { z } from "zod";

import { loadSuggestionPrompt } from "@/lib/loadDocuments";

// Allow responses up to 30 seconds
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
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Default model if none provided (kann ein schnelleres Modell sein)
    const selectedModel = model || "google/gemini-2.5-flash-lite";

    // Konvertiere Messages für das Modell
    const modelMessages = convertToModelMessages(messages);
    const suggestionPrompt = await loadSuggestionPrompt();

    // Generiere Suggestions mit generateObject und Schema-Validierung
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

    // Extrahiere Suggestions direkt aus dem Ergebnis und begrenze auf maximal 5
    const suggestions = (result.object.suggestions || []).slice(0, 5);
    return new Response(JSON.stringify({ suggestions }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return new Response(JSON.stringify({ suggestions: [] }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
