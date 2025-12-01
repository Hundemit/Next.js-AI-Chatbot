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
 * Chatbot title displayed in header
 */
export const CHATBOT_TITLE = "Nordi AI";

/**
 * User avatar URL
 */
export const USER_AVATAR_URL =
  "https://upload.wikimedia.org/wikipedia/commons/9/99/Sample_User_Icon.png";

/**
 * Assistant avatar URL
 */
export const ASSISTANT_AVATAR_URL = "/logo.png";

/**
 * Typewriter effect speed in milliseconds per character.
 * Set to 0 to disable the typewriter effect (show text immediately).
 * Example: 20 = 20ms per character (50 characters per second)
 */
export const TYPEWRITER_SPEED = 0; // 0 = disabled, 20 = fast, 50 = medium, 100 = slow
