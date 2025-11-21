"use client";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ui/shadcn-io/ai/conversation";
import { Loader } from "@/components/ui/shadcn-io/ai/loader";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/shadcn-io/ai/message";
import {
  PromptInput,
  PromptInputButton,
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
import { Button } from "@/components/ui/button";
import { PaperclipIcon, RotateCcwIcon } from "lucide-react";
import { UIMessage, useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import Noise from "@/components/Noise";
import { Response } from "@/components/ui/shadcn-io/ai/response";
import { nanoid } from "nanoid";
import {
  Suggestion,
  Suggestions,
} from "@/components/ui/shadcn-io/ai/suggestion";

const models = [
  { id: "google/gemini-2.5-flash-lite", name: "Gemini 2.5 Flash" },
  { id: "openai/gpt-5-nano", name: "GPT-5 Nano" },
  { id: "x-ai/grok-4.1-fast", name: "Grok 4.1 Fast" },
];

export const Chatbot = () => {
  const [selectedModel, setSelectedModel] = useState(models[0].id);
  const [input, setInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const initialMessage: UIMessage = useMemo(
    () => ({
      id: nanoid(),
      role: "assistant" as const,
      parts: [
        {
          type: "text" as const,
          text: "Hallo! Ich bin dein AI-Assistent. Wie kann ich dir helfen?",
        },
      ],
    }),
    []
  );

  const { messages, sendMessage, status, setMessages } = useChat();
  const isLoading = status === "submitted" || status === "streaming";

  useEffect(() => {
    setMessages([initialMessage]);
  }, [initialMessage, setMessages]);

  // Lade Suggestions nach jeder Assistant-Antwort
  useEffect(() => {
    const loadSuggestions = async () => {
      // Nur Suggestions laden, wenn:
      // 1. Es gibt Messages
      // 2. Die letzte Nachricht vom Assistant ist
      // 3. Nicht mehr gestreamt wird
      // 4. Die letzte Nachricht tatsächlich Text enthält
      if (
        messages.length === 0 ||
        status === "submitted" ||
        status === "streaming"
      ) {
        return;
      }

      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role !== "assistant") {
        setSuggestions([]);
        return;
      }

      // Extrahiere Text aus der letzten Assistant-Nachricht
      const textParts =
        lastMessage.parts
          ?.filter((part) => part.type === "text")
          .map((part) => (part.type === "text" ? part.text : ""))
          .join("") || "";

      // Nur Suggestions laden, wenn die Nachricht Text enthält
      if (!textParts.trim()) {
        return;
      }

      try {
        const response = await fetch("/api/suggestions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: messages,
            model: selectedModel,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.suggestions || []);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error loading suggestions:", error);
        setSuggestions([]);
      }
    };

    // Debounce: Warte kurz, bevor Suggestions geladen werden
    const timeoutId = setTimeout(loadSuggestions, 500);

    return () => clearTimeout(timeoutId);
  }, [messages, status, selectedModel]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      // Setze Suggestions zurück, wenn User eine neue Nachricht sendet
      setSuggestions([]);
      sendMessage(
        { text: input },
        {
          body: {
            model: selectedModel,
          },
        }
      );
      setInput("");
    }
  };

  const handleReset = useCallback(() => {
    setMessages([initialMessage]);
    setInput("");
    setSuggestions([]);
  }, [setMessages, setInput, initialMessage]);

  const handleSuggestionClick = (suggestion: string) => {
    if (suggestion.trim()) {
      // Setze Suggestions zurück, wenn User auf eine Suggestion klickt
      setSuggestions([]);
      sendMessage(
        { text: suggestion },
        {
          body: {
            model: selectedModel,
          },
        }
      );
    }
  };

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden rounded-xl border bg-background shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-0.5 relative ">
        {/* Dots for the browser-style header */}
        <div className="flex items-center gap-2 ">
          <div className="size-2 rounded-full bg-red-500" />
          <div className="size-2 rounded-full bg-yellow-500" />
          <div className="size-2 rounded-full bg-green-500" />
        </div>
        {/* Name of the chatbot */}
        <span className="font-medium text-sm w-fit absolute left-1/2 -translate-x-1/2">
          Hindemit AI
        </span>
        {/* Reset button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={handleReset}
          className=" text-xs gap-1 h-fit py-1 group"
        >
          <RotateCcwIcon className="size-3 group-hover:-rotate-90 transition-all duration-300" />
          <span className="md:group-hover:w-8 w-0 duration-300 overflow-hidden">
            {" "}
            Reset
          </span>
        </Button>
      </div>

      {/* Conversation Area */}
      <Conversation className="flex-1">
        {/* BLUR GARDIENT TO THE TOP OF THE CONVERSATION AREA */}
        <div className="absolute top-0 left-0 w-full h-12  bg-linear-to-b from-background/90 to-transparent " />
        <ConversationContent className="space-y-4">
          {messages.map((message) => {
            const textParts =
              message.parts
                ?.filter((part) => part.type === "text")
                .map((part) => (part.type === "text" ? part.text : ""))
                .join("") || "";

            return (
              <div key={message.id} className="space-y-3">
                <Message from={message.role}>
                  <MessageContent>
                    {isLoading &&
                    message.role === "assistant" &&
                    textParts === "" ? (
                      <div className="flex items-center gap-2">
                        <Loader size={14} />
                        <span className="text-muted-foreground text-sm">
                          Thinking...
                        </span>
                      </div>
                    ) : (
                      <Response>{textParts}</Response>
                    )}
                  </MessageContent>
                  <MessageAvatar
                    src={
                      message.role === "user"
                        ? "https://github.com/dovazencot.png"
                        : "https://github.com/vercel.png"
                    }
                    name={message.role === "user" ? "User" : "AI"}
                  />
                </Message>
              </div>
            );
          })}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      {/* Suggestions Area */}
      {suggestions.length > 0 && (
        <Suggestions className="border-t w-full py-1 px-2">
          {suggestions.map((suggestion, index) => (
            <Suggestion
              key={index}
              suggestion={suggestion}
              onClick={() => handleSuggestionClick(suggestion)}
            />
          ))}
        </Suggestions>
      )}
      {/* Input Area */}
      <div className="border-t">
        <PromptInput
          className="border-none shadow-none rounded-none"
          onSubmit={handleSubmit}
        >
          <PromptInputTextarea
            className="min-h-0"
            value={input}
            onChange={(e) => setInput(e.currentTarget.value)}
            placeholder="Type your message..."
          />
          <PromptInputToolbar>
            <PromptInputTools>
              <PromptInputButton>
                <PaperclipIcon size={16} />
              </PromptInputButton>

              <PromptInputModelSelect
                value={selectedModel}
                onValueChange={setSelectedModel}
              >
                <PromptInputModelSelectTrigger>
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
              disabled={!input.trim()}
              isInput={input.trim() ? true : false}
              status={status}
            ></PromptInputSubmit>
          </PromptInputToolbar>
        </PromptInput>
      </div>

      <Noise
        patternSize={20}
        patternScaleX={1}
        patternScaleY={1}
        patternRefreshInterval={10}
        patternAlpha={10}
      />
    </div>
  );
};
