"use client";

import { memo } from "react";

import type { ChatStatus } from "ai";

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
import type { Model } from "@/lib/types";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  models: Model[];
  status: ChatStatus;
  disabled?: boolean;
}

/**
 * ChatInput component - handles user input with model selection.
 * Memoized for performance optimization.
 */
export const ChatInput = memo(function ChatInput({
  value,
  onChange,
  onSubmit,
  selectedModel,
  onModelChange,
  models,
  status,
  disabled = false,
}: ChatInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.currentTarget.value);
  };

  return (
    <div className="border-t">
      <PromptInput
        className="rounded-none border-none shadow-none"
        onSubmit={onSubmit}
      >
        <PromptInputTextarea
          className="min-h-0"
          minHeight={0}
          value={value}
          onChange={handleChange}
          placeholder="Type your message..."
          disabled={disabled}
          aria-label="Chat input"
        />
        <PromptInputToolbar>
          <PromptInputTools>
            <PromptInputModelSelect
              value={selectedModel}
              onValueChange={onModelChange}
            >
              <PromptInputModelSelectTrigger aria-label="Select AI model">
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
            disabled={!value.trim() || disabled}
            isInput={value.trim() ? true : false}
            status={status}
            aria-label="Send message"
          />
        </PromptInputToolbar>
      </PromptInput>
    </div>
  );
});
