"use client";

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import { UIMessage, useChat } from "@ai-sdk/react";
import type { ChatStatus } from "ai";
import { nanoid } from "nanoid";

import {
  INITIAL_MESSAGE_TEXT,
  INITIAL_SUGGESTIONS,
} from "@/data/system-messages/initial-information";
import { useSuggestions } from "@/hooks/useSuggestions";
import { hasUserMessages } from "@/lib/chatUtils";
import { MODELS, DEFAULT_MODEL_ID, TYPEWRITER_SPEED } from "@/lib/constants";
import type { Model, Suggestion } from "@/lib/types";

interface ChatContextType {
  isChatbotTyping: boolean;
  setIsChatbotTyping: (isChatbotTyping: boolean) => void;
  messages: UIMessage[];
  setMessages: (messages: UIMessage[]) => void;
  input: string;
  setInput: (input: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  status: ChatStatus;
  sendMessage: (
    message: { text: string },
    options?: { body?: Record<string, unknown> },
  ) => void;
  stopChat: () => void;
  isChatInProgress: boolean;
  suggestions: Suggestion[];
  resetSuggestions: () => void;
  isLoadingSuggestions: boolean;
  stoppedSuggestions: boolean;
  stopSuggestions: () => void;
  hasUserMessages: boolean;
  initialSuggestions: Suggestion[];
  models: Model[];
  typewriterSpeed: number;
  chatIsStopped: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  handleReset: () => void;
  handleSuggestionClick: (suggestion: string) => void;
  handleStop: () => void;
  handleModelChange: (modelId: string) => void;
  handleInputChange: (value: string) => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isChatbotTyping, setIsChatbotTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [input, setInput] = useState("");
  const [chatIsStopped, setChatIsStopped] = useState(false);

  // Create initial message
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

  const {
    messages,
    sendMessage,
    status,
    setMessages,
    stop: stopChat,
  } = useChat();

  const [isChatInProgress, setIsChatInProgress] = useState(
    status === "submitted" || status === "streaming" || isChatbotTyping,
  );

  useEffect(() => {
    setIsChatInProgress(
      status === "submitted" || status === "streaming" || isChatbotTyping,
    );
  }, [status, isChatbotTyping]);

  // Custom hooks for suggestions
  const {
    suggestions,
    reset: resetSuggestions,
    isLoading: isLoadingSuggestions,
    stopped: stoppedSuggestions,
    stop: stopSuggestions,
  } = useSuggestions({
    messages,
    status,
    selectedModel,
  });

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
      setIsChatInProgress(true);
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

  const handleReset = useCallback(() => {
    setMessages([initialMessage]);
    stopChat();
    setInput("");
    resetSuggestions();
    setIsChatInProgress(false);
  }, [
    setMessages,
    initialMessage,
    resetSuggestions,
    stopChat,
    setIsChatInProgress,
  ]);

  const handleSuggestionClick = useCallback(
    (suggestion: string) => {
      setChatIsStopped(false);
      if (suggestion.trim() && !isChatInProgress) {
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
    [selectedModel, sendMessage, isChatInProgress],
  );

  const handleStop = useCallback(() => {
    stopChat();
    stopSuggestions();
    setChatIsStopped(true);
    setIsChatInProgress(false);
  }, [stopChat, stopSuggestions, setChatIsStopped]);

  const handleModelChange = useCallback((modelId: string) => {
    setSelectedModel(modelId);
  }, []);

  const handleInputChange = useCallback((value: string) => {
    setInput(value);
  }, []);

  const value: ChatContextType = {
    isChatbotTyping,
    setIsChatbotTyping,
    messages,
    setMessages,
    input,
    setInput,
    selectedModel,
    setSelectedModel,
    status,
    sendMessage,
    stopChat,
    isChatInProgress,
    suggestions,
    resetSuggestions,
    isLoadingSuggestions,
    stoppedSuggestions,
    stopSuggestions,
    hasUserMessages: hasUserMessagesValue,
    initialSuggestions: INITIAL_SUGGESTIONS,
    models: MODELS,
    typewriterSpeed: TYPEWRITER_SPEED,
    chatIsStopped,
    handleSubmit,
    handleReset,
    handleSuggestionClick,
    handleStop,
    handleModelChange,
    handleInputChange,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
}
