export const SUGGESTION_CATEGORIES = [
  "architecture",
  "rag",
  "api",
  "components",
  "integration",
  "configuration",
  "deployment",
  "general",
] as const;

export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export const FALLBACK_SUGGESTIONS = [
  "Wie funktioniert das RAG-System?",
  "Welche API-Endpunkte gibt es?",
  "Wie ist der Chatbot aufgebaut?",
  "Wie binde ich den Chatbot ein?",
  "Wie wird der Chatbot deployed?",
] as const;

const TOPIC_TERMS = [
  "chatbot",
  "bot",
  "rag",
  "embedding",
  "vektor",
  "vector",
  "index",
  "suche",
  "retrieval",
  "api",
  "endpoint",
  "route",
  "chat",
  "suggestion",
  "vorschlag",
  "komponente",
  "component",
  "react",
  "next",
  "hook",
  "prompt",
  "system-prompt",
  "integration",
  "einbind",
  "einbau",
  "deploy",
  "vercel",
  "konfiguration",
  "config",
  "setup",
  "modell",
  "model",
  "openrouter",
  "token",
  "streaming",
  "architektur",
  "architecture",
  "implementier",
  "code",
  "typescript",
  "ui",
] as const;

const OFF_TOPIC_TERMS = [
  "fitness",
  "fitnessstudio",
  "sport",
  "padel",
  "gaming",
  "musik",
  "essen",
  "döner",
  "pizza",
  "reise",
  "urlaub",
  "familie",
  "hobby",
  "wetter",
  "politik",
] as const;

function normalize(value: string) {
  return value.toLocaleLowerCase("de-DE").replace(/\s+/g, " ").trim();
}

function containsTerm(value: string, terms: readonly string[]) {
  return terms.some((term) => value.includes(term));
}

export function isOnTopicSuggestion(suggestion: string) {
  const normalized = normalize(suggestion);

  if (!normalized) {
    return false;
  }

  const hasTopicFocus = containsTerm(normalized, TOPIC_TERMS);
  const hasOffTopic = containsTerm(normalized, OFF_TOPIC_TERMS);

  return hasTopicFocus && !hasOffTopic;
}

export function applySuggestionPolicy(
  generatedSuggestions: string[],
  maximum: number = FALLBACK_SUGGESTIONS.length,
) {
  const seen = new Set<string>();
  const acceptedSuggestions: string[] = [];
  const rejectedSuggestions: string[] = [];

  for (const suggestion of generatedSuggestions) {
    const normalized = normalize(suggestion);
    if (!normalized || seen.has(normalized)) {
      if (suggestion.trim()) {
        rejectedSuggestions.push(suggestion);
      }
      continue;
    }

    seen.add(normalized);
    if (isOnTopicSuggestion(suggestion)) {
      acceptedSuggestions.push(suggestion.trim());
    } else {
      rejectedSuggestions.push(suggestion);
    }
  }

  const returnedSuggestions = [...acceptedSuggestions];
  for (const fallback of FALLBACK_SUGGESTIONS) {
    if (returnedSuggestions.length >= maximum) {
      break;
    }
    const normalized = normalize(fallback);
    if (!seen.has(normalized)) {
      returnedSuggestions.push(fallback);
      seen.add(normalized);
    }
  }

  return {
    acceptedSuggestions: acceptedSuggestions.slice(0, maximum),
    rejectedSuggestions,
    returnedSuggestions: returnedSuggestions.slice(0, maximum),
  };
}
