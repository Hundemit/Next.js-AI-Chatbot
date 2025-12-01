"use client";

import { memo } from "react";

import { useChatContext } from "./ChatContext";

import {
  PromptInput,
  PromptInputModelSelect,
  PromptInputModelSelectContent,
  PromptInputModelSelectItem,
  PromptInputModelSelectTrigger,
  PromptInputModelSelectValue,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ui/shadcn-io/ai/prompt-input";

/**
 * ChatInput component - handles user input with model selection.
 * Memoized for performance optimization.
 */
export const ChatInput = memo(function ChatInput() {
  const {
    input,
    handleInputChange,
    handleSubmit,
    selectedModel,
    handleModelChange,
    models,
    isChatInProgress,
  } = useChatContext();

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
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputModelSelect
              value={selectedModel}
              onValueChange={handleModelChange}
            >
              <PromptInputModelSelectTrigger
                className="gap-1 bg-transparent text-xs dark:bg-transparent"
                aria-label="Select AI model"
              >
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
