# 🤖 Next.js Chatbot

<div align="center">

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org)
[![Vercel AI SDK](https://img.shields.io/badge/AI%20SDK-Vercel-000000?style=for-the-badge)](https://sdk.vercel.ai)

A modern, full-featured chatbot built with Next.js, React, and the Vercel AI SDK, designed for easy integration into your Next.js projects.

</div>

---

## ℹ️ About the Project

This Next.js Chatbot, built with React and the Vercel AI SDK, is designed for seamless integration into existing Next.js projects. It offers a robust foundation for AI-powered conversations, featuring flexible model selection via OpenRouter, real-time streaming responses, intelligent suggestions, and an optional Retrieval-Augmented Generation (RAG) system for document integration.

---

## ✨ Features

- **Flexible Model Selection**: Easily switch between various AI models (Gemini, GPT, Grok) via OpenRouter without code changes.
- **Streaming Responses**: Real-time, fluid user experience with streamed AI answers using the Vercel AI SDK.
- **Intelligent Suggestions**: Both initial and dynamically generated follow-up questions enhance user interaction.
- **RAG System (Optional)**: Integrate your documents (Markdown, TXT, PDF, DOCX, JSON, CSV) to provide context-aware responses without external vector databases.
- **Markdown & Content Rendering**: Full support for GitHub Flavored Markdown, syntax highlighting with Shiki, and LaTeX math rendering with KaTeX.
- **Modern UI**: Built with a responsive design and components based on `shadcn/ui` and Radix UI primitives.

---

## 🛠 Tech Stack

### Frontend

- **[Next.js 16](https://nextjs.org)** - React Framework with App Router
- **[React 19](https://react.dev)** - UI Library
- **[TypeScript 5.0](https://www.typescriptlang.org)** - Type Safety

### AI & Backend

- **[Vercel AI SDK](https://sdk.vercel.ai)** - AI Abstraction (`@ai-sdk/react`, `ai`)
- **[OpenRouter](https://openrouter.ai)** - Flexible Model Selection (`@openrouter/ai-sdk-provider`)

### UI & Styling

- **[Tailwind CSS](https://tailwindcss.com)** - Utility-First CSS Framework
- **[shadcn/ui](https://ui.shadcn.com)** - UI Components
- **[Radix UI](https://www.radix-ui.com)** - Accessible UI Primitives

### Markdown & Content

- **[react-markdown](https://github.com/remarkjs/react-markdown)** - Markdown Rendering
- **[Shiki](https://shiki.matsu.io)** - Syntax Highlighting
- **[KaTeX](https://katex.org)** - LaTeX Math Rendering

### Utilities

- **[nanoid](https://github.com/ai/nanoid)** - Unique ID Generation
- **[Motion](https://motion.dev)** - Animation Library

---

## 🚀 Quick Start

This guide will help you integrate the Next.js Chatbot into your existing Next.js project.

### 1. Prerequisites

Before you begin, ensure you have the following:

- **Node.js**: Version 18+ or 20+
- **Next.js Project**: An existing Next.js project (version 15+ recommended) using the App Router.
- **OpenRouter API Key**: Obtain one from [OpenRouter.ai](https://openrouter.ai).

### 2. Install Dependencies

Install all required packages with a single command:

```bash
pnpm install @ai-sdk/react @icons-pack/react-simple-icons @next/mdx @openrouter/ai-sdk-provider @radix-ui/react-accordion @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-navigation-menu @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tooltip @radix-ui/react-use-controllable-state @shikijs/transformers @styleglide/kit-view-provider @tailwindcss/typography ai class-variance-authority clsx copy-to-clipboard embla-carousel-react harden-react-markdown katex lucide-react motion nanoid next-safe-action react-fast-marquee react-markdown react-syntax-highlighter rehype-katex remark-gfm remark-math shiki tailwind-merge tailwind-scrollbar-hide use-stick-to-bottom
```

**Optional RAG dependencies** (only if you plan to use the RAG system):

```bash
pnpm install js-tiktoken mammoth pdf2json
```

### 3. Copy Files to Your Project

Copy the following directories and files into your `src/` directory:

```
src/
├── app/
│ └── api/
│ ├── chat/route.ts # REQUIRED - Main chat completion API
│ ├── suggestions/route.ts # REQUIRED - Dynamic suggestion API
│ └── rag/reindex/route.ts # OPTIONAL - RAG re-indexing endpoint
├── components/
│ ├── chatbot/ # REQUIRED - All core Chatbot components
│ │ ├── Chatbot.tsx
│ │ ├── ChatContext.tsx
│ │ ├── ChatHeader.tsx
│ │ ├── ChatInput.tsx
│ │ ├── ChatMessages.tsx
│ │ ├── ChatSuggestions.tsx
│ │ ├── index.ts # Export file for Chatbot components
│ │ └── TypewriterText.tsx
│ ├── ui/ # REQUIRED - Reusable UI components (shadcn/ui based)
│ │ ├── accordion.tsx
│ │ ├── avatar.tsx
│ │ ├── badge.tsx
│ │ ├── blur-fade.tsx
│ │ ├── button.tsx
│ │ ├── card.tsx
│ │ ├── carousel.tsx
│ │ ├── checkbox.tsx
│ │ ├── collapsible.tsx
│ │ ├── form.tsx
│ │ ├── hover-card.tsx
│ │ ├── input.tsx
│ │ ├── label.tsx
│ │ ├── navigation-menu.tsx
│ │ ├── scroll-area.tsx
│ │ ├── select.tsx
│ │ ├── shadcn-io/ai/ # Specific AI UI components
│ │ │ ├── actions.tsx
│ │ │ ├── branch.tsx
│ │ │ ├── code-block.tsx
│ │ │ ├── conversation.tsx
│ │ │ ├── image.tsx
│ │ │ ├── inline-citation.tsx
│ │ │ ├── loader.tsx
│ │ │ ├── message.tsx
│ │ │ ├── prompt-input.tsx
│ │ │ ├── reasoning.tsx
│ │ │ ├── response.tsx
│ │ │ ├── source.tsx
│ │ │ ├── suggestion.tsx
│ │ │ ├── task.tsx
│ │ │ └── web-preview.tsx
│ │ ├── shadcn-io/code-block/ # Code block components (for markdown rendering)
│ │ │ ├── index.tsx
│ │ │ └── server.tsx
│ │ ├── skeleton.tsx
│ │ ├── switch.tsx
│ │ ├── textarea.tsx
│ │ └── tooltip.tsx
│ └── status-badges.tsx # REQUIRED (if using status badges in ChatMessages)
├── data/
│ ├── knowledge-base/ # OPTIONAL - Documents for RAG
│ │ ├── company-data.md
│ │ ├── customer-policies.md
│ │ └── ...
│ └── system-messages/ # REQUIRED - AI prompts and initial suggestions
│ ├── initial-information.ts
│ ├── suggestion-prompt.txt
│ └── system-prompt.txt
├── hooks/
│ └── useSuggestions.ts # REQUIRED - Custom hook for dynamic suggestions
└── lib/
├── chatUtils.ts # REQUIRED - Chat utility functions
├── constants.ts # REQUIRED - General configuration (models, avatars, etc.)
├── form-schema.ts # REQUIRED (if using form validation)
├── loadDocuments.ts # REQUIRED - Functions to load prompts and RAG documents
├── rag/ # OPTIONAL - RAG system logic
│ ├── chunker.ts
│ ├── config.ts
│ ├── index.ts
│ ├── parsers.ts
│ ├── types.ts
│ └── vectorStore.ts
├── types.ts # REQUIRED - Shared TypeScript types
└── utils.ts # REQUIRED - Utility functions (e.g., cn for Tailwind)
```

### 4. Configuration

**A) Environment Variables (`.env.local`)**

Create a `.env.local` file in your project root and add your OpenRouter API key:

```env
OPENROUTER_API_KEY=your_api_key_here
```

**B) General Constants (`src/lib/constants.ts`)**

Adjust the following constants to fit your needs:

```typescript
// ... existing code ...
export const MODELS: Model[] = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
  // Add new models here (refer to OpenRouter documentation for IDs)
];

export const DEFAULT_MODEL_ID = MODELS[0].id;

export const CHATBOT_TITLE = "Your Chatbot Title"; // Displayed in the header
export const USER_AVATAR_URL = "your_user_avatar_url.png";
export const ASSISTANT_AVATAR_URL = "your_assistant_avatar_url.png";

export const TYPEWRITER_SPEED = 0; // 0 = disabled, 20 = fast, 50 = medium, 100 = slow
// ... existing code ...
```

**C) System Prompts (`src/data/system-messages/`)**

Fill these files with your content:

- **`system-prompt.txt`**: The main system prompt guiding the assistant's behavior.
- **`suggestion-prompt.txt`**: A specific prompt used to generate follow-up questions.
- **`initial-information.ts`**: Defines the initial greeting message and suggestions shown when the chatbot starts.

**D) RAG Configuration (`src/lib/rag/config.ts`) (Optional)**

If you plan to use the RAG system, configure it in `src/lib/rag/config.ts`:

```typescript
// ... existing code ...
export const RAG_CONFIG = {
  knowledgeBasePath: join(process.cwd(), "src", "data", "knowledge-base"),
  supportedFormats: [".pdf", ".docx", ".txt", ".md", ".json", ".csv"],
  chunkTokens: 512, // Maximum tokens per chunk
  chunkOverlapTokens: 32, // Overlap between chunks
  topK: 20, // Number of top-k chunks to retrieve for context
  minSimilarity: 0.3, // Minimum cosine similarity for relevant chunks (0.0-1.0, lower = more results)
  cachePath: process.env.VERCEL // Cache location for the RAG index
    ? "/tmp/rag-index.json"
    : join(process.cwd(), ".next", "cache", "rag-index.json"),
  embeddingBatchSize: 16,
  maxFileSizeMB: 50,
  enableOCR: false,
  piiRedaction: false,
  vectorStore: "file" as const, // 'file' | 'faiss' | 'sqlite'
};
// ... existing code ...
```

You can also add your documents to `src/data/knowledge-base/`. After adding or modifying documents, you need to reindex them by making a POST request to `/api/rag/reindex`.

```bash
curl -X POST http://localhost:3000/api/rag/reindex
# To force a complete re-indexing (deletes and recreates the index):
curl -X POST -H "Content-Type: application/json" -d '{"force": true}' http://localhost:3000/api/rag/reindex
```

### 5. Integration Example

To integrate the chatbot into your page, import the `Chatbot` component and render it. For example, in `src/app/page.tsx`:

```typescript
"use client";

import { Chatbot } from "@/components/chatbot";
import { ThemeProvider } from "@/components/theme-provider";

export default function Home() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <main className="flex min-h-screen flex-col items-center justify-between p-24">
        <Chatbot />
      </main>
    </ThemeProvider>
  );
}
```

### 6. Troubleshooting

- **`OPENROUTER_API_KEY is not set`**: Ensure `OPENROUTER_API_KEY` is correctly set in your `.env.local` file.
- **RAG Issues (documents not found)**: Manually trigger a re-indexing via `curl -X POST http://localhost:3000/api/rag/reindex` after adding or modifying documents in `src/data/knowledge-base/`.
- **Model not responding**: Check your internet connection and verify that the selected model is available on OpenRouter.

---

## 🔗 Links & Resources

- **OpenRouter**: [OpenRouter.ai](https://openrouter.ai)
- **Vercel AI SDK**: [sdk.vercel.ai](https://sdk.vercel.ai)
- **Next.js Documentation**: [nextjs.org/docs](https://nextjs.org/docs)
- **shadcn/ui**: [ui.shadcn.com](https://ui.shadcn.com)
