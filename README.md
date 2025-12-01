# 🤖 Hindemit AI - Next.js Chatbot

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Vercel AI SDK](https://img.shields.io/badge/AI%20SDK-Vercel-000000?style=for-the-badge)](https://sdk.vercel.ai)

Ein moderner, vollständig funktionsfähiger Chatbot mit Next.js, React und der Vercel AI SDK. Unterstützt mehrere AI-Modelle über OpenRouter, Streaming Responses, intelligente Suggestions und ein RAG-System.

[Features](#-features) • [Installation](#-getting-started) • [Dokumentation](./LANDING.md) • [Tech Stack](#-tech-stack)

</div>

---

## 📋 Über das Projekt

**Hindemit AI** ist ein produktionsreifer Chatbot, der auf Next.js 16 (App Router), React 19 und TypeScript aufbaut. Der Chatbot nutzt die Vercel AI SDK in Kombination mit OpenRouter, um eine flexible und skalierbare Lösung für KI-gestützte Konversationen zu bieten.

Der Chatbot bietet eine vollständige Chat-Erfahrung mit Streaming Responses, intelligenten Suggestions, einem RAG-System zur Integration von Dokumenten und einer modernen, responsiven UI mit vielen Komponenten von shadcn-io.

### ✨ Was macht es besonders?

- 🎯 **Flexible Model-Auswahl**: Wechsel zwischen verschiedenen AI-Modellen (Gemini, GPT, Grok) über OpenRouter - ohne Code-Änderungen
- ⚡ **Streaming Responses**: Nahtlose, in Echtzeit generierte Antworten für eine flüssige Benutzererfahrung
- 🧠 **Intelligente Suggestions**: Initiale und dynamisch generierte Folgefragen für bessere Interaktion
- 📚 **RAG-System**: Integration von Dokumenten ohne externe Vector-Datenbank
- 🎨 **Moderne UI**: Professionelles Design mit shadcn-io Komponenten
- 📝 **Markdown + LaTeX**: Vollständige Unterstützung für Code-Blöcke, Mathematik und mehr

---

## 🎯 Features

### 🔄 Flexible Model-Auswahl

Modelle können einfach und schnell über OpenRouter-Anbindung getauscht werden. Unterstützt werden verschiedene Modelle wie:

- **Google Gemini 2.5 Flash** (Standard)
- **OpenAI GPT-5 Nano**
- **xAI Grok 4.1 Fast**

### ⚡ Streaming Responses

Alle Chat-Antworten werden als Stream geliefert, was eine flüssige Benutzererfahrung ermöglicht. Die Implementierung nutzt die `streamText` Funktion der Vercel AI SDK.

### 🧠 Intelligente Suggestions

- **Initial Suggestions**: Beim Start geladene Suggestions aus einer JSON-Datei
- **Dynamic Suggestions**: Automatisch generierte 3-5 relevante Folgefragen nach jeder Assistenten-Antwort

### 📚 RAG-System (Retrieval-Augmented Generation)

Der Chatbot nutzt ein internes RAG-System, um relevante Informationen aus einer Knowledge Base zu laden und in die Konversation zu integrieren. Dies ermöglicht es dem Chatbot, auf spezifische Dokumente zu antworten, ohne externe Vector-Datenbanken zu benötigen.

**Wie es funktioniert:**

1.  **Dokumente hinzufügen**: Lege `.md`, `.txt`, `.pdf`, `.docx`, `.json` oder `.csv` Dateien in `src/data/knowledge-base/` ab.
2.  **Indexierung**: Beim ersten Start des Development Servers oder nach einem expliziten Re-Indexing werden diese Dokumente geparst, in kleinere "Chunks" unterteilt und als "Embeddings" (numerische Vektorrepräsentationen) in einem lokalen Vector Store gespeichert.
3.  **Suche**: Wenn ein Benutzer eine Frage stellt, wird diese Frage ebenfalls in ein Embedding umgewandelt. Das System sucht dann im Vector Store nach den relevantesten Dokument-Chunks (basierend auf der Ähnlichkeit der Embeddings).
4.  **Kontextintegration**: Die gefundenen relevanten Chunks werden zusammen mit dem System-Prompt an das AI-Modell gesendet, um eine präzisere und kontextbezogenere Antwort zu generieren.

**Konfiguration:**

Die RAG-Konfiguration kann in [`src/lib/rag/config.ts`](src/lib/rag/config.ts) angepasst werden, einschließlich des Pfads zur Knowledge Base, unterstützter Dateiformate, Chunk-Größen und Ähnlichkeitsschwellenwerte.

**Re-Indexing:**

Nachdem du Dokumente in `src/data/knowledge-base/` hinzugefügt, geändert oder gelöscht hast, musst du ein Re-Indexing auslösen, damit die Änderungen wirksam werden. Dies kann manuell über den `/api/rag/reindex` API-Endpunkt erfolgen:

```bash
curl -X POST http://localhost:3000/api/rag/reindex
# Um ein vollständiges Re-Indexing zu erzwingen (löscht und erstellt den Index neu):
curl -X POST -H "Content-Type: application/json" -d '{"force": true}' http://localhost:3000/api/rag/reindex
```

### 📝 Markdown & Content Rendering

- **Markdown**: Vollständige Unterstützung mit GitHub Flavored Markdown
- **Syntax-Highlighting**: Code-Blöcke mit Shiki
- **LaTeX/Math**: Mathematische Formeln mit KaTeX
- **Tabellen & Lists**: GFM Features für erweiterte Formatierung

### 🎨 Moderne UI

Viele Komponenten wurden von **shadcn-io** verwendet:

- Conversation-Komponenten für die Chat-Ansicht
- Message-Komponenten mit Avatar-Support
- Prompt-Input mit integrierter Toolbar
- Responsive Design für Desktop und Mobile

### 🔄 Real-time Chat-Interface

- Persistente Konversationshistorie während der Session
- Auto-Scroll zu neuen Nachrichten
- Loading States mit visuellem Feedback
- Reset-Funktionalität für neue Konversationen

---

## 🛠 Tech Stack

### Frontend

- **[Next.js 16](https://nextjs.org)** - React Framework mit App Router
- **[React 19](https://react.dev)** - UI Library
- **[TypeScript](https://www.typescriptlang.org)** - Type Safety

### AI & Backend

- **[Vercel AI SDK](https://sdk.vercel.ai)** - AI Abstraktion (`@ai-sdk/react`, `ai`)
- **[OpenRouter](https://openrouter.ai)** - Flexible Model-Auswahl (`@openrouter/ai-sdk-provider`)

### UI & Styling

- **[Tailwind CSS](https://tailwindcss.com)** - Utility-First CSS Framework
- **[shadcn/ui](https://ui.shadcn.com)** - Viele Komponenten von shadcn-io
- **[Radix UI](https://www.radix-ui.com)** - Zugängliche UI Primitives

### Markdown & Content

- **[react-markdown](https://github.com/remarkjs/react-markdown)** - Markdown Rendering
- **[Shiki](https://shiki.matsu.io)** - Syntax Highlighting
- **[KaTeX](https://katex.org)** - LaTeX Math Rendering

### Utilities

- **[nanoid](https://github.com/ai/nanoid)** - Unique ID Generation
- **[Motion](https://motion.dev)** - Animation Library

---

## 🚀 Getting Started

### Voraussetzungen

- **Node.js** 18+ oder 20+
- **npm**, **pnpm**, **yarn** oder **bun**
- **OpenRouter API Key** ([Hier anmelden](https://openrouter.ai))

### Installation

1. **Repository klonen**

   ```bash
   git clone https://github.com/yourusername/nextjs-chatbot.git
   cd nextjs-chatbot
   ```

2. **Abhängigkeiten installieren**

   ```bash
   npm install
   # oder
   pnpm install
   # oder
   yarn install
   ```

3. **Umgebungsvariablen konfigurieren**

   Erstelle eine `.env.local` Datei im Root-Verzeichnis:

   ```env
   OPENROUTER_API_KEY=your_api_key_here
   ```

   > **Hinweis**: Erhalte deinen API Key auf [OpenRouter](https://openrouter.ai)

4. **Knowledge Base initialisieren (optional, aber empfohlen)**

   Beim ersten Start des Development Servers wird die Knowledge Base automatisch indiziert. Du kannst den Index auch manuell über einen API-Endpunkt aktualisieren:

   ```bash
   curl -X POST http://localhost:3000/api/rag/reindex
   # Oder um ein vollständiges Re-Indexing zu erzwingen:
   curl -X POST -H "Content-Type: application/json" -d '{"force": true}' http://localhost:3000/api/rag/reindex
   ```

   > **Hinweis**: Das Re-Indexing ist notwendig, wenn du neue Dokumente hinzufügst, bestehende änderst oder löschst.

5. **Development Server starten**

   ```bash
   npm run dev
   # oder
   pnpm dev
   # oder
   yarn dev
   ```

6. **Öffne [http://localhost:3000](http://localhost:3000)** in deinem Browser

### Production Build

```bash
npm run build
npm start
```

---

## ⚙️ Konfiguration

### Model-Auswahl anpassen

Die verfügbaren AI-Modelle und der Standardmodell können in [`src/lib/constants.ts`](src/lib/constants.ts) angepasst werden. Die hier definierten Modelle werden im Dropdown des Chatbots angezeigt.

```typescript
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  // Füge hier neue Modelle hinzu (siehe OpenRouter-Dokumentation für IDs)
];

export const DEFAULT_MODEL_ID = MODELS[0].id;
```

### System-Prompts anpassen

Die Verhaltensweisen des Chatbots können über System-Prompts gesteuert werden:

- **Haupt-System-Prompt**: [`src/data/system-messages/system-prompt.txt`](src/data/system-messages/system-prompt.txt)
- **Suggestion-Prompt**: [`src/data/system-messages/suggestion-prompt.txt`](src/data/system-messages/suggestion-prompt.txt)

### Dokumente für RAG hinzufügen

Füge `.md`, `.txt`, `.pdf`, `.docx`, `.json` oder `.csv` Dateien zu [`src/data/knowledge-base/`](src/data/knowledge-base/) hinzu. Diese Dokumente werden automatisch vom RAG-System indiziert (nach einem Re-Indexing).

**Beispiel:**

```
src/data/knowledge-base/
├── company-data.md
├── customer-policies.md
├── new-product-docs.md      # Neu hinzufügen
└── support-faq.txt          # Neu hinzufügen
```

### Initiale Suggestions anpassen

Die initialen Gesprächsvorschläge, die beim Start des Chatbots angezeigt werden, können in [`src/data/system-messages/initial-information.ts`](src/data/system-messages/initial-information.ts) angepasst werden:

```typescript
export const INITIAL_SUGGESTIONS = [
  "Wie kannst du mir helfen?",
  "Was sind deine Funktionen?",
  "Erzähle mir mehr über dich.",
];
```

### RAG-System Konfiguration

Erweiterte Einstellungen für das RAG-System (Chunking, Embedding, Ähnlichkeitsschwellenwert etc.) findest du in [`src/lib/rag/config.ts`](src/lib/rag/config.ts):

```typescript
export const RAG_CONFIG = {
  knowledgeBasePath: join(process.cwd(), "src", "data", "knowledge-base"),
  supportedFormats: [".pdf", ".docx", ".txt", ".md", ".json", ".csv"],
  chunkTokens: 256, // Maximale Token pro Chunk
  chunkOverlapTokens: 32, // Überlappung zwischen Chunks
  topK: 5, // Anzahl der Top-Chunks, die für den Kontext geladen werden
  minSimilarity: 0.3, // Minimale Kosinus-Ähnlichkeit für relevante Chunks
  // ... weitere Einstellungen
};
```

---

## 📁 Projektstruktur

```
nextjs-chatbot/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── chat/           # Chat Completion Endpoint
│   │   │   ├── suggestions/    # Dynamic & Initial Suggestions Endpoint
│   │   │   └── rag/reindex/    # RAG Re-Indexing Endpoint
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/             # React Components
│   │   ├── chatbot/            # Chatbot Components
│   │   └── ui/                 # UI Components (shadcn-io)
│   ├── hooks/                  # Custom React Hooks
│   ├── lib/                    # Utilities & Helpers
│   └── data/                   # Data Files
│       ├── knowledge-base/     # Knowledge Base Documents
│       └── system-messages/    # Prompts & Initial Suggestions
├── public/                     # Static Assets
├── LANDING.md                  # Detaillierte Dokumentation
└── README.md                   # Diese Datei
```

> 📖 Für eine detaillierte Beschreibung der Architektur siehe [LANDING.md](./LANDING.md)

---

## 💻 Verwendung

Dieser Chatbot ist auf einfache Integration und Erweiterbarkeit ausgelegt. Hier sind die grundlegenden Interaktionen und Anpassungsmöglichkeiten für Entwickler.

### Quick-Start für Entwickler

1.  **Klonen & Installieren**: Hol dir das Projekt und installiere die Abhängigkeiten.
    ```bash
    git clone https://github.com/yourusername/nextjs-chatbot.git
    cd nextjs-chatbot
    pnpm install # oder npm install / yarn install
    ```
2.  **API Key**: Füge deinen `OPENROUTER_API_KEY` in `.env.local` ein.
3.  **Starten**: Starte den Development Server.
    ```bash
    pnpm dev # oder npm run dev / yarn dev
    ```
4.  **Anpassen**: Bearbeite [`src/lib/constants.ts`](src/lib/constants.ts) für Modelle, [`src/data/system-messages/system-prompt.txt`](src/data/system-messages/system-prompt.txt) für Prompts und [`src/data/knowledge-base/`](src/data/knowledge-base/) für eigene Dokumente.

### Basis-Interaktion

1.  **Nachricht eingeben**: Tippe deine Frage in das Eingabefeld.
2.  **Model auswählen**: Wähle ein AI-Modell aus dem Dropdown (optional, konfiguriert in [`src/lib/constants.ts`](src/lib/constants.ts)).
3.  **Absenden**: Klicke auf den Submit-Button oder drücke Enter.
4.  **Antwort erhalten**: Sieh zu, wie die Antwort in Echtzeit gestreamt wird.

### Suggestions nutzen

- **Initial Suggestions**: Klicke auf eine der vorgeschlagenen Fragen beim Start (konfiguriert in [`src/data/system-messages/initial-information.ts`](src/data/system-messages/initial-information.ts)).
- **Dynamic Suggestions**: Nach jeder Assistenten-Antwort werden relevante Folgefragen angezeigt (generiert über `/api/suggestions`).

### Konversation zurücksetzen

Klicke auf den **Reset**-Button im Header, um die Konversation zu löschen und neu zu starten.

### Troubleshooting

- **`OPENROUTER_API_KEY is not set`**: Stelle sicher, dass `OPENROUTER_API_KEY` in deiner `.env.local` Datei korrekt gesetzt ist.
- **RAG-Probleme (Dokumente werden nicht gefunden)**: Führe ein manuelles Re-Indexing über `curl -X POST http://localhost:3000/api/rag/reindex` aus, nachdem du Dokumente hinzugefügt oder geändert hast.
- **Modell reagiert nicht**: Überprüfe deine Internetverbindung und stelle sicher, dass das ausgewählte Modell auf OpenRouter verfügbar ist.

---

## 📚 Weitere Dokumentation

Für detaillierte technische Dokumentation, Architektur-Übersicht, API-Dokumentation und Entwickler-Informationen siehe:

**[📖 LANDING.md](./LANDING.md)** - Vollständige technische Dokumentation

Die LANDING.md enthält:

- Detaillierte Architektur-Beschreibung
- Komplette API-Dokumentation
- Komponenten-Dokumentation
- Hooks & Utilities
- Erweiterungsmöglichkeiten
- Best Practices

---

## 🤝 Contributing

Beiträge sind willkommen! Hier sind einige Möglichkeiten, wie du helfen kannst:

### Issues melden

1. Prüfe, ob das Issue bereits existiert
2. Erstelle ein neues Issue mit:
   - Klarer Beschreibung des Problems
   - Steps to Reproduce
   - Erwartetes Verhalten
   - Screenshots (falls relevant)

### Pull Requests

1. **Fork** das Repository
2. Erstelle einen **Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit** deine Änderungen (`git commit -m 'Add some AmazingFeature'`)
4. **Push** zum Branch (`git push origin feature/AmazingFeature`)
5. Öffne einen **Pull Request**

### Code-Standards

- Verwende TypeScript für alle neuen Dateien
- Folge den bestehenden Code-Konventionen
- Teste deine Änderungen lokal
- Aktualisiere die Dokumentation wenn nötig

---

## 📝 License

Dieses Projekt ist unter der MIT License lizenziert - siehe die [LICENSE](LICENSE) Datei für Details.

---

## 🔗 Links & Ressourcen

- **Repository**: [GitHub](https://github.com/yourusername/nextjs-chatbot)
- **Issues**: [GitHub Issues](https://github.com/yourusername/nextjs-chatbot/issues)
- **OpenRouter**: [OpenRouter.ai](https://openrouter.ai)
- **Vercel AI SDK**: [sdk.vercel.ai](https://sdk.vercel.ai)
- **Next.js Dokumentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)

---

## 🙏 Danksagungen

- [Vercel](https://vercel.com) für das AI SDK
- [OpenRouter](https://openrouter.ai) für die flexible Model-Auswahl
- [shadcn](https://twitter.com/shadcn) für die großartigen UI-Komponenten
- Alle Contributors und Nutzer des Projekts

---

<div align="center">

**Made with ❤️ using Next.js, React, and TypeScript**

⭐ Star dieses Repository wenn es dir hilft!

</div>
