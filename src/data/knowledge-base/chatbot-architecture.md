# Chatbot Architektur - Technische Dokumentation

## Übersicht

Dieser Chatbot ist eine moderne, AI-gestützte Konversationsanwendung, gebaut mit Next.js 15, React 19, dem Vercel AI SDK und OpenRouter als LLM-Provider. Das System verwendet RAG (Retrieval Augmented Generation) für kontextbezogene Antworten.

## Tech-Stack

| Technologie | Version | Zweck |
|-------------|---------|-------|
| Next.js | 15.x | React Framework mit App Router |
| React | 19.x | UI-Bibliothek |
| AI SDK (`ai`, `@ai-sdk/react`) | Latest | Chat-Funktionalität und Streaming |
| OpenRouter | - | LLM-Provider (Multi-Model-Support) |
| TypeScript | 5.x | Typsicherheit |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | - | UI-Komponenten |

## Ordnerstruktur

```
src/
├── app/
│   └── api/
│       ├── chat/
│       │   └── route.ts          # Haupt-Chat-API mit RAG
│       └── suggestions/
│           └── route.ts          # Suggestions-API
├── components/
│   └── chatbot/
│       ├── index.ts              # Public Exports
│       ├── Chatbot.tsx           # Haupt-Komponente
│       ├── ChatContext.tsx       # State Management (React Context)
│       ├── ChatHeader.tsx        # Header mit Reset
│       ├── ChatInput.tsx         # Eingabefeld + Model-Select
│       ├── ChatMessages.tsx      # Nachrichtenanzeige
│       ├── ChatSuggestions.tsx   # Vorschläge-Buttons
│       └── TypewriterText.tsx    # Typewriter-Animation
├── hooks/
│   └── useSuggestions.ts         # Custom Hook für Suggestions
├── lib/
│   ├── chatUtils.ts              # Utility-Funktionen
│   ├── constants.ts              # Konfiguration (Models, URLs)
│   ├── loadDocuments.ts          # Document Loader
│   ├── types.ts                  # TypeScript Types
│   └── rag/
│       ├── index.ts              # RAG Haupt-Logik
│       ├── config.ts             # RAG Konfiguration
│       ├── chunker.ts            # Text-Chunking
│       ├── parsers.ts            # Datei-Parser
│       ├── types.ts              # RAG Types
│       └── vectorStore.ts        # Vector Store (Cosine Similarity)
└── data/
    ├── knowledge-base/           # Markdown-Dokumente für RAG
    └── system-messages/
        ├── initial-information.ts # Initiale Nachricht + Suggestions
        ├── system-prompt.txt      # System-Prompt für LLM
        └── suggestion-prompt.txt  # Prompt für Suggestions
```

## Komponenten-Hierarchie

```
<Chatbot>
  └── <ChatProvider>              # Context Provider (State Management)
        └── <ChatbotContent>
              ├── <ChatHeader />      # Title + Reset Button
              ├── <ChatMessages />    # Nachrichtenliste
              │     └── <TypewriterText /> # Optional: Animation
              ├── <ChatSuggestions /> # Vorschläge
              └── <ChatInput />       # Eingabe + Model-Select
```

## Datenfluss

### 1. Nachricht senden (User -> AI)

```
User tippt Nachricht
       ↓
ChatInput.handleChange() → ChatContext.handleInputChange()
       ↓
User klickt "Senden" oder drückt Enter
       ↓
ChatInput.onSubmit() → ChatContext.handleSubmit()
       ↓
useChat.sendMessage() mit { text, model }
       ↓
POST /api/chat (Next.js API Route)
       ↓
┌─────────────────────────────────────┐
│ API Route verarbeitet Request:      │
│ 1. Extrahiere letzte User-Message   │
│ 2. RAG: Suche relevante Chunks      │
│ 3. Kombiniere System-Prompt + RAG   │
│ 4. Sende an OpenRouter LLM          │
│ 5. Stream Response zurück           │
└─────────────────────────────────────┘
       ↓
useChat empfängt Stream
       ↓
ChatContext.messages wird aktualisiert
       ↓
ChatMessages rendert neue Nachricht
       ↓
(Optional) TypewriterText animiert Text
```

### 2. Suggestions laden

```
Assistant-Nachricht wird empfangen
       ↓
useSuggestions Hook (useEffect)
       ↓
Debounce: 500ms Verzögerung
       ↓
POST /api/suggestions
       ↓
┌─────────────────────────────────────┐
│ Suggestions API:                    │
│ 1. Konvertiere Messages             │
│ 2. generateObject() mit Schema      │
│ 3. Return Array von Strings         │
└─────────────────────────────────────┘
       ↓
ChatSuggestions rendert Buttons
```

### 3. RAG-Pipeline (Retrieval Augmented Generation)

```
Initialisierung (beim Server-Start):
┌─────────────────────────────────────┐
│ initializeKnowledgeBase()           │
│ 1. Lese alle Dateien aus            │
│    src/data/knowledge-base/         │
│ 2. Parse Dateien (MD, TXT, etc.)    │
│ 3. Chunke Text (512 Tokens)         │
│ 4. Generiere Embeddings (OpenAI)    │
│ 5. Speichere in Vector Store        │
│    (.next/cache/rag-index.json)     │
└─────────────────────────────────────┘

Bei jeder User-Anfrage:
┌─────────────────────────────────────┐
│ searchRelevantChunks(userQuery)     │
│ 1. Generiere Query-Embedding        │
│ 2. Cosine Similarity Suche          │
│ 3. Filter: minSimilarity >= 0.3     │
│ 4. Return Top-K Chunks (default 20) │
│ 5. Kombiniere mit System-Prompt     │
└─────────────────────────────────────┘
```

## State Management

Der gesamte Chat-State wird zentral im `ChatContext` verwaltet:

### States

| State | Typ | Beschreibung |
|-------|-----|--------------|
| `messages` | `UIMessage[]` | Alle Chat-Nachrichten |
| `input` | `string` | Aktueller Eingabetext |
| `selectedModel` | `string` | Ausgewähltes AI-Modell |
| `status` | `ChatStatus` | `idle`, `submitted`, `streaming`, `ready` |
| `isChatbotTyping` | `boolean` | Typewriter-Animation aktiv |
| `isChatInProgress` | `boolean` | Computed: status oder typing |
| `suggestions` | `Suggestion[]` | Aktuelle Vorschläge |
| `chatIsStopped` | `boolean` | Chat wurde gestoppt |

### Handler

| Handler | Beschreibung |
|---------|--------------|
| `handleSubmit` | Sendet Nachricht |
| `handleReset` | Setzt Chat zurück |
| `handleStop` | Stoppt laufende Anfrage |
| `handleSuggestionClick` | Sendet Vorschlag als Nachricht |
| `handleModelChange` | Wechselt AI-Modell |
| `handleInputChange` | Aktualisiert Eingabetext |

## API-Endpunkte

### POST /api/chat

**Request Body:**
```typescript
{
  messages: UIMessage[];  // Chat-Verlauf
  model?: string;         // Optional: Model-ID
}
```

**Response:** Server-Sent Events (SSE) Stream

**Verarbeitung:**
1. Validiere `OPENROUTER_API_KEY`
2. Warte auf Knowledge Base Initialisierung (max 5s)
3. Extrahiere User-Query aus letzter Nachricht
4. Lade relevanten RAG-Kontext oder Fallback
5. Streame Antwort via `streamText()`

### POST /api/suggestions

**Request Body:**
```typescript
{
  messages: UIMessage[];  // Chat-Verlauf
  model?: string;         // Optional: Model-ID
}
```

**Response:**
```typescript
{
  suggestions: string[];  // 3-5 Folgefragen
}
```

## Konfiguration

### Models (src/lib/constants.ts)

```typescript
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
];

export const DEFAULT_MODEL_ID = MODELS[0].id;
export const CHATBOT_TITLE = "Nordi AI";
export const TYPEWRITER_SPEED = 0; // 0 = deaktiviert
```

### RAG (src/lib/rag/config.ts)

```typescript
export const RAG_CONFIG = {
  knowledgeBasePath: "src/data/knowledge-base",
  supportedFormats: [".pdf", ".docx", ".txt", ".md", ".json", ".csv"],
  chunkTokens: 512,
  chunkOverlapTokens: 32,
  topK: 20,
  minSimilarity: 0.3,
  embeddingBatchSize: 16,
  maxFileSizeMB: 50,
};
```

## Abhängigkeiten zwischen Dateien

```
Chatbot.tsx
  ├── imports: ChatContext (ChatProvider, useChatContext)
  ├── imports: ChatHeader, ChatMessages, ChatSuggestions, ChatInput
  └── imports: constants (CHATBOT_TITLE)

ChatContext.tsx
  ├── imports: @ai-sdk/react (UIMessage, useChat)
  ├── imports: initial-information (INITIAL_MESSAGE_TEXT, INITIAL_SUGGESTIONS)
  ├── imports: useSuggestions (Hook)
  ├── imports: chatUtils (hasUserMessages, formatErrorMessage)
  ├── imports: constants (MODELS, DEFAULT_MODEL_ID, TYPEWRITER_SPEED)
  └── imports: types (Model, Suggestion)

ChatMessages.tsx
  ├── imports: ChatContext (useChatContext)
  ├── imports: TypewriterText
  ├── imports: shadcn-io/ai Komponenten
  ├── imports: chatUtils (extractTextFromMessage, isMessageEmpty)
  └── imports: constants (USER_AVATAR_URL, ASSISTANT_AVATAR_URL)

useSuggestions.ts
  ├── imports: @ai-sdk/react (UIMessage)
  ├── imports: chatUtils (extractTextFromMessage, hasUserMessages)
  └── imports: types (Suggestion)

api/chat/route.ts
  ├── imports: @openrouter/ai-sdk-provider
  ├── imports: ai (convertToModelMessages, streamText)
  ├── imports: chatUtils (extractTextFromMessage)
  ├── imports: loadDocuments (loadRelevantContext, loadFullContext)
  └── imports: rag/index (initializeKnowledgeBase)
```

## Environment Variables

| Variable | Erforderlich | Beschreibung |
|----------|--------------|--------------|
| `OPENROUTER_API_KEY` | Ja | API-Key für OpenRouter |
| `VERCEL` | Nein | Automatisch auf Vercel gesetzt |

## Performance-Optimierungen

1. **Memoization**: Alle Komponenten sind mit `memo()` gewrappt
2. **useCallback**: Alle Handler sind memoized
3. **useMemo**: Computed values wie `isChatInProgress`
4. **Debouncing**: Suggestions laden mit 500ms Verzögerung
5. **AbortController**: Abbruch von laufenden Requests möglich
6. **Lazy Loading**: RAG-Index wird im Hintergrund initialisiert
7. **Caching**: Vector Store Index wird in `.next/cache/` gespeichert

