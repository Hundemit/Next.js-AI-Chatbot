import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { convertToModelMessages, streamText, type UIMessage } from "ai";
import { loadFullContext } from "@/lib/loadDocuments";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

export async function POST(req: Request) {
  const { messages, model }: { messages: UIMessage[]; model?: string } =
    await req.json();

  // Log the model information for debugging
  console.log("---------------START-----------------");
  console.log("Model:", model);
  console.log("---------------END-----------------");

  // Also log the incoming messages for inspection
  if (!process.env.OPENROUTER_API_KEY) {
    return new Response("OPENROUTER_API_KEY is not set", { status: 500 });
  }

  // Default model if none provided
  const selectedModel = model || "google/gemini-2.5-flash-lite";

  // Lade System-Prompt und Dokumente
  const systemContext = await loadFullContext(true);

  const result = streamText({
    model: openrouter.chat(selectedModel),
    system: systemContext || undefined,
    messages: convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
