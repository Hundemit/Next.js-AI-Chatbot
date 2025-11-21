import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, generateText, type UIMessage } from "ai";

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

    // Generiere Suggestions
    const result = await generateText({
      model: openrouter.chat(selectedModel),
      system: suggestionPrompt,
      messages: [
        ...modelMessages,
        {
          role: "user" as const,
          content:
            "Generiere basierend auf der letzten Antwort des Assistenten 3-5 relevante Folgefragen als JSON-Array.",
        },
      ],
    });

    // Parse JSON-Array aus der Antwort
    let suggestions: string[] = [];
    try {
      const text = result.text.trim();
      // Entferne mögliche Markdown-Code-Blöcke
      const cleanedText = text
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "");
      suggestions = JSON.parse(cleanedText);

      // Validiere, dass es ein Array von Strings ist
      if (!Array.isArray(suggestions)) {
        throw new Error("Response is not an array");
      }
      suggestions = suggestions.filter(
        (s) => typeof s === "string" && s.trim().length > 0
      );

      // Begrenze auf maximal 5 Suggestions
      suggestions = suggestions.slice(0, 5);
    } catch (parseError) {
      console.error("Error parsing suggestions JSON:", parseError);
      console.error("Raw response:", result.text);
      // Fallback: Versuche, Fragen aus dem Text zu extrahieren
      const lines = result.text
        .split("\n")
        .filter((line) => line.trim().length > 0);
      suggestions = lines
        .map((line) =>
          line
            .replace(/^[-*•]\s*/, "")
            .replace(/^"\s*/, "")
            .replace(/\s*"$/, "")
            .trim()
        )
        .filter((line) => line.length > 0 && line.length < 100)
        .slice(0, 5);
    }

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
