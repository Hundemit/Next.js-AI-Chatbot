"use client";

import { ChatProvider, useChatContext } from "./ChatContext";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { ChatSuggestions } from "./ChatSuggestions";

import { CHATBOT_TITLE } from "@/lib/constants";

/**
 * Main Chatbot component - orchestrates all sub-components and manages state.
 * Refactored for better performance, maintainability, and code quality.
 */
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
