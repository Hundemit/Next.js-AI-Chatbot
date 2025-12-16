# Chatbot Entwickler-Anleitung

Diese Anleitung erklärt, wie der Chatbot erweitert und angepasst werden kann.

---

## Inhaltsverzeichnis

1. [Neue AI-Modelle hinzufügen](#1-neue-ai-modelle-hinzufügen)
2. [Knowledge Base erweitern](#2-knowledge-base-erweitern)
3. [System-Prompt anpassen](#3-system-prompt-anpassen)
4. [Initiale Nachricht ändern](#4-initiale-nachricht-ändern)
5. [Neue UI-Funktionen hinzufügen](#5-neue-ui-funktionen-hinzufügen)
6. [Typewriter-Effekt konfigurieren](#6-typewriter-effekt-konfigurieren)
7. [RAG-Parameter tunen](#7-rag-parameter-tunen)
8. [Fehlerbehandlung erweitern](#8-fehlerbehandlung-erweitern)
9. [Styling anpassen](#9-styling-anpassen)
10. [Debugging und Logging](#10-debugging-und-logging)

---

## 1. Neue AI-Modelle hinzufügen

### Schritt 1: constants.ts aktualisieren

**Datei:** `src/lib/constants.ts`

```typescript
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  // Neues Modell hinzufügen:
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
  { id: "meta-llama/llama-3.1-70b-instruct", name: "Llama 3.1 70B" },
];

// Optional: Default-Modell ändern
export const DEFAULT_MODEL_ID = "anthropic/claude-3.5-sonnet";
```

### Schritt 2: Model-Interface prüfen

**Datei:** `src/lib/types.ts`

```typescript
export interface Model {
  id: string;   // OpenRouter Model-ID
  name: string; // Anzeigename im Dropdown
}
```

### Verfügbare Modelle finden

OpenRouter unterstützt viele Modelle. Liste unter: https://openrouter.ai/models

Gängige Model-IDs:
- `google/gemini-2.5-flash-lite` - Schnell, günstig
- `openai/gpt-4o` - GPT-4 Omni
- `anthropic/claude-3.5-sonnet` - Claude 3.5
- `meta-llama/llama-3.1-70b-instruct` - Open Source
- `mistralai/mixtral-8x7b-instruct` - Open Source

---

## 2. Knowledge Base erweitern

### Neue Markdown-Datei hinzufügen

**Pfad:** `src/data/knowledge-base/`

1. Erstelle neue `.md` Datei:

```markdown
# Neues Thema - Dokumentation

## Abschnitt 1

Inhalt hier...

## Abschnitt 2

Weiterer Inhalt...
```

2. Speichere als `neues-thema.md`

### Unterstützte Formate

- `.md` - Markdown (empfohlen)
- `.txt` - Plain Text
- `.pdf` - PDF-Dokumente
- `.docx` - Word-Dokumente
- `.json` - JSON-Daten
- `.csv` - CSV-Tabellen

### Re-Indexing erzwingen

Nach dem Hinzufügen neuer Dokumente muss der Index neu erstellt werden:

**Option 1:** Server neu starten

```bash
pnpm dev
```

**Option 2:** API-Endpoint aufrufen

```bash
curl -X POST http://localhost:3000/api/rag/reindex \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Option 3:** Cache löschen

```bash
rm -rf .next/cache/rag-index.json
pnpm dev
```

### Best Practices für Knowledge Base

1. **Strukturierte Überschriften:** Verwende `#`, `##`, `###`
2. **Kurze Absätze:** 2-4 Sätze pro Absatz für besseres Chunking
3. **Eindeutige Begriffe:** Vermeide Mehrdeutigkeiten
4. **Konsistente Terminologie:** Gleiche Begriffe überall verwenden

---

## 3. System-Prompt anpassen

**Datei:** `src/data/system-messages/system-prompt.txt`

### Aktueller Prompt

```
Rolle:
Du bist ein Unternehmens-Assistent für die fiktive NovaTech Solutions GmbH.

Wissen:
Du hast Zugriff auf die folgenden Informationsquellen...

Verhalten:
- Antworte klar, präzise, freundlich und professionell
- Erfinde keine Fakten ("No Hallucinations")
...
```

### Anpassung für anderen Use-Case

```
Rolle:
Du bist ein technischer Support-Assistent für [Produktname].
Du hilfst Nutzern bei technischen Fragen und Problemen.

Wissen:
Du hast Zugriff auf die Produktdokumentation und FAQ.

Verhalten:
- Gib präzise technische Anleitungen
- Frage nach mehr Details wenn nötig
- Verweise auf relevante Dokumentation
- Eskaliere komplexe Probleme zum menschlichen Support
```

### Prompt für Code-Assistenten

```
Rolle:
Du bist ein Code-Assistent spezialisiert auf TypeScript und React.

Verhalten:
- Erkläre Code verständlich
- Gib vollständige, funktionierende Code-Beispiele
- Folge Best Practices und aktuellen Standards
- Verwende TypeScript-Typen korrekt
```

---

## 4. Initiale Nachricht ändern

**Datei:** `src/data/system-messages/initial-information.ts`

### Initiale Begrüßung

```typescript
export const INITIAL_MESSAGE_TEXT =
  "Hallo! Ich bin dein AI-Assistent. Wie kann ich dir helfen?";
```

### Initiale Suggestions

```typescript
export const INITIAL_SUGGESTIONS = [
  "Wie kannst du mir helfen?",
  "Was sind deine Funktionen?",
  "Erzähle mir mehr über dich.",
];
```

### Anpassung für spezifischen Use-Case

```typescript
// Für einen Produkt-Support-Bot
export const INITIAL_MESSAGE_TEXT =
  "Willkommen beim TechProduct Support! Ich helfe dir bei Fragen zu Installation, Konfiguration und Troubleshooting.";

export const INITIAL_SUGGESTIONS = [
  "Wie installiere ich das Produkt?",
  "Ich habe ein Problem mit der Verbindung",
  "Wo finde ich die Dokumentation?",
  "Kontakt zum Support-Team",
];
```

---

## 5. Neue UI-Funktionen hinzufügen

### Beispiel: Stop-Button hinzufügen

**Datei:** `src/components/chatbot/ChatInput.tsx`

```typescript
import { StopCircleIcon } from "lucide-react";

export const ChatInput = memo(function ChatInput() {
  const {
    input,
    handleInputChange,
    handleSubmit,
    handleStop, // Neu
    isChatInProgress, // Für Stop-Button
    // ...
  } = useChatContext();

  return (
    <div className="border-t">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          value={input}
          onChange={handleChange}
          placeholder="Type your message..."
          disabled={isChatInProgress}
        />
        <PromptInputToolbar>
          {/* Stop-Button wenn Chat läuft */}
          {isChatInProgress && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleStop}
            >
              <StopCircleIcon className="mr-1 size-4" />
              Stop
            </Button>
          )}
          <PromptInputSubmit disabled={!input.trim()} />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
});
```

### Beispiel: Nachricht löschen

**Schritt 1:** Handler zu ChatContext hinzufügen

```typescript
// In ChatContext.tsx
const handleDeleteMessage = useCallback((messageId: string) => {
  setMessages((prev) => prev.filter((msg) => msg.id !== messageId));
}, [setMessages]);

// In value-Objekt aufnehmen
const value: ChatContextType = {
  // ...
  handleDeleteMessage,
};
```

**Schritt 2:** Interface erweitern

```typescript
interface ChatContextType {
  // ...
  handleDeleteMessage: (messageId: string) => void;
}
```

**Schritt 3:** In ChatMessages.tsx verwenden

```typescript
const { handleDeleteMessage } = useChatContext();

// Im Message-Rendering
<Button
  size="sm"
  variant="ghost"
  onClick={() => handleDeleteMessage(message.id)}
>
  <TrashIcon className="size-3" />
</Button>
```

---

## 6. Typewriter-Effekt konfigurieren

**Datei:** `src/lib/constants.ts`

```typescript
// Typewriter-Geschwindigkeit in Millisekunden pro Zeichen
// 0 = deaktiviert (Text erscheint sofort)
// 10 = sehr schnell (100 Zeichen/Sekunde)
// 20 = schnell (50 Zeichen/Sekunde)
// 50 = mittel (20 Zeichen/Sekunde)
// 100 = langsam (10 Zeichen/Sekunde)
export const TYPEWRITER_SPEED = 0;
```

### Typewriter aktivieren

```typescript
export const TYPEWRITER_SPEED = 20; // Schneller Effekt
```

### Typewriter komplett ersetzen

Wenn du einen anderen Effekt möchtest, bearbeite `TypewriterText.tsx`:

```typescript
// Beispiel: Wortweiser Effekt statt zeichenweise
useEffect(() => {
  const words = text.split(' ');
  let currentWordIndex = 0;

  const interval = setInterval(() => {
    if (currentWordIndex < words.length) {
      setDisplayedText(words.slice(0, currentWordIndex + 1).join(' '));
      currentWordIndex++;
    } else {
      clearInterval(interval);
    }
  }, 100); // 100ms pro Wort

  return () => clearInterval(interval);
}, [text]);
```

---

## 7. RAG-Parameter tunen

**Datei:** `src/lib/rag/config.ts`

### Mehr Ergebnisse erhalten

```typescript
export const RAG_CONFIG = {
  // ...
  topK: 30,           // Von 20 auf 30 erhöht
  minSimilarity: 0.2, // Von 0.3 auf 0.2 gesenkt
};
```

### Präzisere Ergebnisse

```typescript
export const RAG_CONFIG = {
  // ...
  topK: 10,           // Weniger, aber relevantere Ergebnisse
  minSimilarity: 0.5, // Höherer Schwellwert
};
```

### Größere Chunks für mehr Kontext

```typescript
export const RAG_CONFIG = {
  // ...
  chunkTokens: 1024,      // Von 512 auf 1024
  chunkOverlapTokens: 64, // Proportional erhöht
};
```

### Embedding-Modell ändern

**Datei:** `src/lib/rag/index.ts`

```typescript
// Aktuell
const EMBEDDING_MODEL = "text-embedding-3-small";

// Alternative: Größeres Modell für bessere Qualität
const EMBEDDING_MODEL = "text-embedding-3-large";

// Alternative: Ada (günstiger)
const EMBEDDING_MODEL = "text-embedding-ada-002";
```

---

## 8. Fehlerbehandlung erweitern

**Datei:** `src/lib/chatUtils.ts`

### Neue Fehlertypen hinzufügen

```typescript
export function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Bestehende Fehler
    if (error.name === "AbortError") {
      return "Die Anfrage wurde abgebrochen.";
    }
    if (error.message.includes("Network Error")) {
      return "Verbindungsproblem. Bitte Internetverbindung prüfen.";
    }

    // Neue Fehlertypen
    if (error.message.includes("rate limit")) {
      return "Zu viele Anfragen. Bitte warte einen Moment.";
    }
    if (error.message.includes("model not found")) {
      return "Das ausgewählte AI-Modell ist nicht verfügbar.";
    }
    if (error.message.includes("context length")) {
      return "Die Konversation ist zu lang. Bitte starte eine neue.";
    }
  }

  return "Ein unerwarteter Fehler ist aufgetreten.";
}
```

### Retry-Logik hinzufügen

```typescript
// In ChatContext.tsx
const sendMessageWithRetry = useCallback(async (
  message: { text: string },
  options?: { body?: Record<string, unknown> },
  retries = 3
) => {
  for (let i = 0; i < retries; i++) {
    try {
      await sendMessage(message, options);
      return;
    } catch (error) {
      if (i === retries - 1) {
        addErrorMessage(error);
        throw error;
      }
      // Exponential Backoff
      await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
    }
  }
}, [sendMessage, addErrorMessage]);
```

---

## 9. Styling anpassen

### Chatbot-Container

**Datei:** `src/components/chatbot/Chatbot.tsx`

```typescript
<div className="bg-card relative flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-xl">
```

Anpassungen:
- `rounded-xl` → `rounded-none` für eckige Ecken
- `shadow-xl` → `shadow-md` für weniger Schatten
- `border` → `border-2 border-primary` für farbigen Rahmen

### Header-Farben

**Datei:** `src/components/chatbot/ChatHeader.tsx`

```typescript
// Dots-Farben ändern
<div className="size-2 rounded-full bg-blue-500" />
<div className="size-2 rounded-full bg-green-500" />
<div className="size-2 rounded-full bg-purple-500" />
```

### Nachrichten-Bubbles

**Datei:** `src/components/chatbot/ChatMessages.tsx`

Die Message-Komponente verwendet shadcn-io/ai. Für tiefere Anpassungen:

```typescript
// Eigene Message-Komponente
<div className={cn(
  "rounded-lg p-3",
  message.role === "user"
    ? "bg-primary text-primary-foreground ml-auto"
    : "bg-muted"
)}>
  {textParts}
</div>
```

### Dark Mode

Der Chatbot unterstützt automatisch Dark Mode via Tailwind CSS Klassen wie `bg-card`, `text-foreground`, etc.

---

## 10. Debugging und Logging

### RAG-Debugging aktivieren

Die RAG-Funktionen haben bereits Console-Logs. Aktiviere sie in der Browser-Konsole oder Server-Logs:

```
🔍 Suche nach relevanten Chunks für Query: [query]
📊 Query Embedding generiert, Länge: 1536
📚 Index: 15 Chunks total, 15 mit Embeddings
🔢 Similarity-Scores (Top 5): [...]
✅ Suche abgeschlossen: 5 Ergebnisse gefunden
```

### Eigene Debug-Logs hinzufügen

```typescript
// In ChatContext.tsx
const handleSubmit = useCallback((e: React.FormEvent) => {
  console.log("[Chat] Submitting:", { input, selectedModel });
  // ...
}, [input, selectedModel]);
```

### Netzwerk-Requests inspizieren

Browser DevTools → Network Tab:
- `/api/chat` - Chat-Requests (SSE Stream)
- `/api/suggestions` - Suggestion-Requests

### State debuggen

```typescript
// In einer Komponente
const context = useChatContext();
useEffect(() => {
  console.log("[Chat State]", {
    messagesCount: context.messages.length,
    status: context.status,
    isChatInProgress: context.isChatInProgress,
    suggestions: context.suggestions,
  });
}, [context]);
```

---

## Häufige Probleme und Lösungen

### Problem: Suggestions werden nicht geladen

**Ursachen:**
1. Status ist noch `streaming`
2. `stoppedSuggestions` ist `true`
3. Keine User-Messages vorhanden

**Lösung:**
```typescript
// Prüfe Bedingungen in useSuggestions.ts
console.log({
  messagesLength: messages.length,
  status,
  stopped,
  lastMessageRole: messages[messages.length - 1]?.role,
  hasUserMessages: hasUserMessages(messages),
});
```

### Problem: RAG findet keine relevanten Chunks

**Ursachen:**
1. `minSimilarity` zu hoch
2. Index nicht aktualisiert
3. Embedding-Dimensionen stimmen nicht

**Lösung:**
```typescript
// In rag/config.ts
minSimilarity: 0.1, // Sehr niedriger Wert zum Testen

// Prüfe Index-Status
const index = await vectorStore.loadIndex();
console.log("Chunks im Index:", index?.chunks.length);
```

### Problem: Typewriter-Effekt ruckelt

**Ursache:** Zu viele Re-Renders während Animation

**Lösung:**
```typescript
// In TypewriterText.tsx - requestAnimationFrame verwenden
const animate = () => {
  if (currentIndex < text.length) {
    setDisplayedText(text.slice(0, currentIndex + 1));
    currentIndex++;
    requestAnimationFrame(animate);
  }
};
requestAnimationFrame(animate);
```

### Problem: Chat hängt im "Thinking..." Status

**Ursache:** Stream wurde nicht korrekt beendet

**Lösung:**
```typescript
// In ChatContext.tsx
useEffect(() => {
  // Timeout für stuck status
  if (status === "streaming") {
    const timeout = setTimeout(() => {
      if (status === "streaming") {
        console.warn("Chat stuck, forcing stop");
        stopChat();
      }
    }, 60000); // 60 Sekunden Timeout
    return () => clearTimeout(timeout);
  }
}, [status, stopChat]);
```

---

## Code-Qualität Best Practices

### 1. TypeScript strikt nutzen

```typescript
// Gut: Explizite Typen
const handleClick = (suggestion: string): void => {
  handleSuggestionClick(suggestion);
};

// Vermeiden: any
const handleClick = (suggestion: any) => {
  handleSuggestionClick(suggestion);
};
```

### 2. Memoization korrekt einsetzen

```typescript
// Gut: Abhängigkeiten korrekt
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a, b]
);

// Vermeiden: Fehlende Abhängigkeiten
const memoizedValue = useMemo(
  () => computeExpensiveValue(a, b),
  [a] // b fehlt!
);
```

### 3. Cleanup in useEffect

```typescript
useEffect(() => {
  const controller = new AbortController();

  fetchData({ signal: controller.signal });

  return () => controller.abort(); // Cleanup!
}, []);
```

### 4. Error Boundaries für UI

```typescript
// ErrorBoundary.tsx
class ChatErrorBoundary extends React.Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Chat konnte nicht geladen werden.</div>;
    }
    return this.props.children;
  }
}

// Verwendung
<ChatErrorBoundary>
  <Chatbot />
</ChatErrorBoundary>
```

