import type { Model } from "./types";

/**
 * Available AI models for the chatbot
 */
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
];

/**
 * Default model ID
 */
export const DEFAULT_MODEL_ID = MODELS[0].id;

/**
 * Initial assistant message text
 */
export const INITIAL_MESSAGE_TEXT =
  "Hallo! Ich bin dein AI-Assistent. Wie kann ich dir helfen?";

/**
 * Chatbot title displayed in header
 */
export const CHATBOT_TITLE = "Hindemit AI";

/**
 * User avatar URL
 */
export const USER_AVATAR_URL =
  "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

/**
 * Assistant avatar URL
 */
export const ASSISTANT_AVATAR_URL = "/logo.png";
