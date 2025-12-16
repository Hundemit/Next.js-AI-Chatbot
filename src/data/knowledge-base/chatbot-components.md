# Chatbot Komponenten - Detaillierte Dokumentation

## Übersicht

Alle Chatbot-Komponenten befinden sich in `src/components/chatbot/`. Jede Komponente ist mit `memo()` für Performance-Optimierung gewrappt.

---

## 1. Chatbot.tsx (Haupt-Komponente)

**Pfad:** `src/components/chatbot/Chatbot.tsx`

**Zweck:** Orchestriert alle Sub-Komponenten und stellt den ChatProvider bereit.

### Code-Struktur

```typescript
"use client";

import { ChatProvider, useChatContext } from "./ChatContext";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { ChatSuggestions } from "./ChatSuggestions";
import { CHATBOT_TITLE } from "@/lib/constants";

const ChatbotContent = () => {
  const { handleReset } = useChatContext();

  return (
    <div className="bg-card relative flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-xl">
      <ChatHeader title={CHATBOT_TITLE} onReset={handleReset} />
      <ChatMessages />
      <ChatSuggestions />
      <ChatInput />
    </div>
  );
};

export const Chatbot = () => {
  return (
    <ChatProvider>
      <ChatbotContent />
    </ChatProvider>
  );
};
```

### Verwendung

```tsx
import { Chatbot } from "@/components/chatbot";

export default function Page() {
  return (
    <div className="h-[600px] w-full max-w-2xl">
      <Chatbot />
    </div>
  );
}
```

### Styling

- Container: `bg-card`, `rounded-xl`, `border`, `shadow-xl`
- Layout: Flexbox Column, `h-full`, `w-full`
- Overflow: `overflow-hidden` für saubere Ränder

---

## 2. ChatContext.tsx (State Management)

**Pfad:** `src/components/chatbot/ChatContext.tsx`

**Zweck:** Zentrales State Management mit React Context. Verwaltet alle Chat-bezogenen States und Handler.

### ChatContextType Interface

```typescript
interface ChatContextType {
  // States
  isChatbotTyping: boolean;
  messages: UIMessage[];
  input: string;
  selectedModel: string;
  status: ChatStatus;
  isChatInProgress: boolean;
  suggestions: Suggestion[];
  isLoadingSuggestions: boolean;
  stoppedSuggestions: boolean;
  hasUserMessages: boolean;
  initialSuggestions: Suggestion[];
  models: Model[];
  typewriterSpeed: number;
  chatIsStopped: boolean;

  // Setters
  setIsChatbotTyping: (isChatbotTyping: boolean) => void;
  setMessages: (messages: UIMessage[]) => void;
  setInput: (input: string) => void;
  setSelectedModel: (modelId: string) => void;

  // Handler
  sendMessage: (message: { text: string }, options?: { body?: Record<string, unknown> }) => void;
  stopChat: () => void;
  resetSuggestions: () => void;
  stopSuggestions: () => void;
  handleSubmit: (e: React.FormEvent) => void;
  handleReset: () => void;
  handleSuggestionClick: (suggestion: string) => void;
  handleStop: () => void;
  handleModelChange: (modelId: string) => void;
  handleInputChange: (value: string) => void;
  addErrorMessage: (error: unknown) => void;
}
```

### Wichtige Implementierungsdetails

#### Initial Message erstellen

```typescript
const initialMessage: UIMessage = useMemo(
  () => ({
    id: nanoid(),
    role: "assistant" as const,
    parts: [
      {
        type: "text" as const,
        text: INITIAL_MESSAGE_TEXT,
      },
    ],
  }),
  [],
);
```

#### useChat Hook Integration

```typescript
const {
  messages,
  sendMessage,
  status,
  setMessages,
  stop: stopChat,
  error,
} = useChat({
  onError: (e) => {
    addErrorMessage(e);
  },
});
```

#### isChatInProgress berechnen

```typescript
const isChatInProgress = useMemo(
  () => status === "submitted" || status === "streaming" || isChatbotTyping,
  [status, isChatbotTyping],
);
```

#### handleSubmit Implementation

```typescript
const handleSubmit = useCallback(
  (e: React.FormEvent) => {
    e.preventDefault();
    setChatIsStopped(false);
    if (input.trim()) {
      sendMessage(
        { text: input },
        {
          body: {
            model: selectedModel,
          },
        },
      );
      setInput("");
    }
  },
  [input, selectedModel, sendMessage],
);
```

#### handleReset Implementation

```typescript
const handleReset = useCallback(() => {
  setMessages([initialMessage]);
  stopChat();
  setInput("");
  resetSuggestions();
  setIsChatbotTyping(false);
}, [setMessages, initialMessage, resetSuggestions, stopChat, setIsChatbotTyping]);
```

### useChatContext Hook

```typescript
export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
```

---

## 3. ChatHeader.tsx

**Pfad:** `src/components/chatbot/ChatHeader.tsx`

**Zweck:** Browser-Style Header mit farbigen Dots, Titel und Reset-Button.

### Props Interface

```typescript
interface ChatHeaderProps {
  title: string;
  onReset: () => void;
}
```

### Code-Struktur

```typescript
export const ChatHeader = memo(function ChatHeader({
  title,
  onReset,
}: ChatHeaderProps) {
  return (
    <div className="bg-muted/50 relative flex items-center justify-between border-b px-4 py-0.5">
      {/* Browser-Style Dots */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-red-500" />
        <div className="size-2 rounded-full bg-yellow-500" />
        <div className="size-2 rounded-full bg-green-500" />
      </div>

      {/* Zentrierter Titel */}
      <span className="absolute left-1/2 w-fit -translate-x-1/2 text-sm font-medium">
        {title}
      </span>

      {/* Reset Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onReset}
        className="group h-fit gap-0 py-1 text-xs"
        aria-label="Reset conversation"
      >
        <RotateCcwIcon className="size-3 transition-all duration-300 group-hover:-rotate-90" />
        <span className="ml-1 overflow-hidden duration-300 group-hover:ml-1 sm:ml-0 sm:w-0 md:group-hover:w-8">
          Reset
        </span>
      </Button>
    </div>
  );
});
```

### Anpassung

- **Titel ändern:** In `src/lib/constants.ts` → `CHATBOT_TITLE`
- **Dots entfernen:** Die div mit `gap-2` löschen
- **Reset-Button Style:** Button-Variante ändern

---

## 4. ChatInput.tsx

**Pfad:** `src/components/chatbot/ChatInput.tsx`

**Zweck:** Eingabefeld mit Model-Auswahl Dropdown.

### Verwendete Context-Values

```typescript
const {
  input,
  handleInputChange,
  handleSubmit,
  selectedModel,
  handleModelChange,
  models,
  isChatInProgress,
} = useChatContext();
```

### Code-Struktur

```typescript
export const ChatInput = memo(function ChatInput() {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleInputChange(e.currentTarget.value);
  };

  return (
    <div className="border-t">
      <PromptInput
        className="rounded-none border-none shadow-none"
        onSubmit={handleSubmit}
      >
        <PromptInputTextarea
          className="min-h-0"
          minHeight={0}
          value={input}
          onChange={handleChange}
          placeholder="Type your message..."
          disabled={isChatInProgress}
          aria-label="Chat input"
        />
        <PromptInputToolbar className="border-none">
          <PromptInputTools>
            {/* Model Select Dropdown */}
            <PromptInputModelSelect
              value={selectedModel}
              onValueChange={handleModelChange}
            >
              <PromptInputModelSelectTrigger className="gap-1 bg-transparent text-xs">
                <PromptInputModelSelectValue />
              </PromptInputModelSelectTrigger>
              <PromptInputModelSelectContent>
                {models.map((model) => (
                  <PromptInputModelSelectItem key={model.id} value={model.id}>
                    {model.name}
                  </PromptInputModelSelectItem>
                ))}
              </PromptInputModelSelectContent>
            </PromptInputModelSelect>
          </PromptInputTools>
          <PromptInputSubmit
            disabled={!input.trim() && !isChatInProgress}
            isInput={input.trim() ? true : false}
            aria-label="Send message"
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
});
```

### Anpassung Modelle

In `src/lib/constants.ts`:

```typescript
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  // Neues Modell hinzufügen:
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet" },
];
```

---

## 5. ChatMessages.tsx

**Pfad:** `src/components/chatbot/ChatMessages.tsx`

**Zweck:** Zeigt alle Chat-Nachrichten an, mit optionalem Typewriter-Effekt und Copy-Button.

### Verwendete Context-Values

```typescript
const { messages, typewriterSpeed, isChatInProgress } = useChatContext();
```

### Wichtige Features

#### Copy-to-Clipboard

```typescript
const actions = [
  {
    icon: CopyIcon,
    label: "Copy",
    onClick: (textParts: string) => handleCopy(textParts),
    iconThenClicked: CheckIcon,
  },
];

const handleCopy = (textParts: string) => {
  setCopied(true);
  copy(textParts);
  setTimeout(() => setCopied(false), 1000);
};
```

#### Loading Indicator

```typescript
// Zeigt "Thinking..." wenn Chat läuft und letzte Nachricht vom User ist
{isChatInProgress &&
  showLoadingIndicator &&
  messages[messages.length - 1]?.role === "user" && (
    <div className="flex items-center gap-2">
      <Loader size={14} />
      <span className="text-muted-foreground text-sm">Thinking...</span>
    </div>
  )}
```

#### Typewriter-Effekt

```typescript
{(typewriterSpeed ?? 0) > 0 && message.role === "assistant" ? (
  <TypewriterText text={textParts} speed={typewriterSpeed ?? 0}>
    {(displayedText) => <Response>{displayedText}</Response>}
  </TypewriterText>
) : (
  <Response>{textParts}</Response>
)}
```

### Message-Rendering

```typescript
{messages.map((message) => {
  const textParts = extractTextFromMessage(message);
  const isEmpty = isMessageEmpty(message);

  return (
    <Message key={message.id} className="group p-0 pb-8" from={message.role}>
      <MessageContent>
        {/* Content basierend auf Status */}
      </MessageContent>
      <MessageAvatar
        src={message.role === "user" ? USER_AVATAR_URL : ASSISTANT_AVATAR_URL}
        name={message.role === "user" ? "User" : "AI"}
      />
    </Message>
  );
})}
```

---

## 6. ChatSuggestions.tsx

**Pfad:** `src/components/chatbot/ChatSuggestions.tsx`

**Zweck:** Zeigt klickbare Vorschläge (initial oder dynamisch generiert).

### Verwendete Context-Values

```typescript
const {
  initialSuggestions,
  suggestions: dynamicSuggestions,
  hasUserMessages,
  handleSuggestionClick,
  isLoadingSuggestions,
  isChatInProgress,
  stoppedSuggestions,
  chatIsStopped,
  status,
} = useChatContext();
```

### Logik für Suggestion-Auswahl

```typescript
// Zeige dynamische Suggestions wenn User bereits geschrieben hat
const showDynamic = useMemo(() => {
  return hasUserMessages && dynamicSuggestions.length > 0;
}, [hasUserMessages, dynamicSuggestions.length]);

// Wähle zwischen dynamischen oder initialen Suggestions
const suggestions = useMemo(() => {
  return showDynamic ? dynamicSuggestions : initialSuggestions;
}, [showDynamic, dynamicSuggestions, initialSuggestions]);
```

### Disabled-State

```typescript
const disabled = useMemo(
  () =>
    (isLoadingSuggestions && !stoppedSuggestions) ||
    (isChatInProgress && !stoppedSuggestions) ||
    (isWaitingForSuggestions && !stoppedSuggestions),
  [isLoadingSuggestions, stoppedSuggestions, isChatInProgress, isWaitingForSuggestions]
);
```

### Rendering

```typescript
<Suggestions className="w-full gap-2 border-t border-dashed p-2">
  {suggestions.map((suggestion, index) => (
    <Suggestion
      key={suggestion}
      index={index}
      suggestion={suggestion}
      onClick={handleSuggestionClick}
      disabled={disabled}
    />
  ))}
</Suggestions>
```

### Initiale Suggestions anpassen

In `src/data/system-messages/initial-information.ts`:

```typescript
export const INITIAL_SUGGESTIONS = [
  "Wie kannst du mir helfen?",
  "Was sind deine Funktionen?",
  "Erzähle mir mehr über dich.",
];
```

---

## 7. TypewriterText.tsx

**Pfad:** `src/components/chatbot/TypewriterText.tsx`

**Zweck:** Animiert Text Zeichen für Zeichen (Typewriter-Effekt).

### Props Interface

```typescript
interface TypewriterTextProps {
  text: string;
  speed?: number; // Millisekunden pro Zeichen (default: 20)
  children: (displayedText: string) => React.ReactNode;
}
```

### Render Props Pattern

```typescript
// Verwendung
<TypewriterText text={textParts} speed={20}>
  {(displayedText) => <Response>{displayedText}</Response>}
</TypewriterText>
```

### Implementierung

```typescript
export const TypewriterText = memo(function TypewriterText({
  text,
  speed = 20,
  children,
}: TypewriterTextProps) {
  const [displayedText, setDisplayedText] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { setIsChatbotTyping, chatIsStopped } = useChatContext();

  useEffect(() => {
    // Animation-Logik mit setInterval
    intervalRef.current = setInterval(() => {
      if (currentIndex < targetLengthRef.current && !chatIsStopped) {
        setDisplayedText(text.slice(0, currentIndex + 1));
        currentIndex++;
        setIsChatbotTyping(true);
      } else {
        clearInterval(intervalRef.current);
        setIsChatbotTyping(false);
      }
    }, speed);

    return () => clearInterval(intervalRef.current);
  }, [text, speed, setIsChatbotTyping, chatIsStopped]);

  return <>{children(displayedText)}</>;
});
```

### Typewriter aktivieren/deaktivieren

In `src/lib/constants.ts`:

```typescript
// 0 = deaktiviert (Text erscheint sofort)
// 20 = schnell (50 Zeichen/Sekunde)
// 50 = mittel (20 Zeichen/Sekunde)
// 100 = langsam (10 Zeichen/Sekunde)
export const TYPEWRITER_SPEED = 0;
```

---

## UI-Komponenten (shadcn-io/ai)

Der Chatbot verwendet spezielle AI-Komponenten aus `@/components/ui/shadcn-io/ai/`:

| Komponente | Pfad | Verwendung |
|------------|------|------------|
| `PromptInput` | `prompt-input.tsx` | Chat-Eingabefeld Container |
| `Message` | `message.tsx` | Einzelne Nachricht |
| `Conversation` | `conversation.tsx` | Nachrichten-Container mit Scroll |
| `Response` | `response.tsx` | Markdown-Rendering für Antworten |
| `Suggestions` | `suggestion.tsx` | Vorschläge-Container |
| `Loader` | `loader.tsx` | Lade-Animation |
| `Actions` | `actions.tsx` | Action-Buttons (Copy, etc.) |

---

## Exports (index.ts)

```typescript
export { Chatbot } from "./Chatbot";
export { ChatHeader } from "./ChatHeader";
export { ChatMessages } from "./ChatMessages";
export { ChatSuggestions } from "./ChatSuggestions";
export { ChatInput } from "./ChatInput";
```

---

## Utility-Funktionen (src/lib/chatUtils.ts)

### extractTextFromMessage

Extrahiert Text aus UIMessage:

```typescript
export function extractTextFromMessage(message: UIMessage): string {
  return (
    message.parts
      ?.filter((part) => part.type === "text")
      .map((part) => (part.type === "text" ? part.text : ""))
      .join("") || ""
  );
}
```

### hasUserMessages

Prüft ob User-Nachrichten existieren:

```typescript
export function hasUserMessages(messages: UIMessage[]): boolean {
  return messages.some((msg) => msg.role === "user");
}
```

### isMessageEmpty

Prüft ob Nachricht leer ist:

```typescript
export function isMessageEmpty(message: UIMessage): boolean {
  return !extractTextFromMessage(message).trim();
}
```

### formatErrorMessage

Formatiert Fehler benutzerfreundlich:

```typescript
export function formatErrorMessage(error: unknown): string {
  // Behandelt verschiedene Fehlertypen:
  // - AbortError → "Die Anfrage wurde abgebrochen..."
  // - Network Error → "Verbindungsproblem..."
  // - Timeout → "Die Anfrage hat zu lange gedauert..."
  // - Sonstige → "Ein unerwarteter Fehler..."
}
```

