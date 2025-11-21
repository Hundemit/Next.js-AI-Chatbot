"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { UIMessage, useChat } from "@ai-sdk/react";
import { nanoid } from "nanoid";

import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { ChatSuggestions } from "./ChatSuggestions";

import { useInitialSuggestions } from "@/hooks/useInitialSuggestions";
import { useSuggestions } from "@/hooks/useSuggestions";
import { hasUserMessages } from "@/lib/chatUtils";
import {
  MODELS,
  DEFAULT_MODEL_ID,
  INITIAL_MESSAGE_TEXT,
  CHATBOT_TITLE,
} from "@/lib/constants";

/**
 * Main Chatbot component - orchestrates all sub-components and manages state.
 * Refactored for better performance, maintainability, and code quality.
 */
export const Chatbot = () => {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [input, setInput] = useState("");

  // Create initial message - moved outside component would be better, but keeping for now
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

  const { messages, sendMessage, status, setMessages } = useChat();
  const isLoading = status === "submitted" || status === "streaming";

  // Custom hooks for suggestions
  const { suggestions, reset: resetSuggestions } = useSuggestions({
    messages,
    status,
    selectedModel,
  });

  const {
    suggestions: initialSuggestions,
    isLoading: isLoadingInitialSuggestions,
    error: initialSuggestionsError,
  } = useInitialSuggestions();

  // Initialize messages with initial message
  useEffect(() => {
    setMessages([initialMessage]);
  }, [initialMessage, setMessages]);

  // Memoize hasUserMessages calculation
  const hasUserMessagesValue = useMemo(
    () => hasUserMessages(messages),
    [messages],
  );

  // Memoized handlers with useCallback
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
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

  const handleReset = useCallback(() => {
    setMessages([initialMessage]);
    setInput("");
    resetSuggestions();
  }, [setMessages, initialMessage, resetSuggestions]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      if (suggestion.trim()) {
        sendMessage(
          { text: suggestion },
          {
            body: {
              model: selectedModel,
            },
          },
        );
      }
    },
    [selectedModel, sendMessage],
  );

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  return (
    <div className="bg-card relative flex h-full w-full flex-col overflow-hidden rounded-xl border shadow-xl">
      <ChatHeader title={CHATBOT_TITLE} onReset={handleReset} />

      <ChatMessages messages={messages} isLoading={isLoading} />

      <ChatSuggestions
        initialSuggestions={initialSuggestions}
        dynamicSuggestions={suggestions}
        hasUserMessages={hasUserMessagesValue}
        onSuggestionClick={handleSuggestionClick}
        isLoadingInitial={isLoadingInitialSuggestions}
        initialSuggestionsError={initialSuggestionsError}
      />

      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        models={MODELS}
        status={status}
        disabled={isLoading}
      />

      {/* <Noise
        patternSize={20}
        patternScaleX={1}
        patternScaleY={1}
        patternRefreshInterval={10}
        patternAlpha={10}
      /> */}
    </div>
  );
};
