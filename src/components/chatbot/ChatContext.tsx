"use client";

import {
  type Context,
  createContext,
  useContext,
  useState,
  type ReactNode,
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
import {
  hasUserMessages,
  formatErrorMessage,
  markLatestTurnAsAborted,
} from "@/lib/chatUtils";
import { MODELS, DEFAULT_MODEL_ID, TYPEWRITER_SPEED } from "@/lib/constants";
import type { Model, Suggestion } from "@/lib/types";
import type { ChatRequestDiagnostic } from "@/lib/rag/types";

interface ChatContextType {
  isChatbotTyping: boolean;
  setIsChatbotTyping: (isChatbotTyping: boolean) => void;
  messages: UIMessage[];
  setMessages: (
    messages: UIMessage[] | ((messages: UIMessage[]) => UIMessage[])
  ) => void;
  input: string;
  setInput: (input: string) => void;
  selectedModel: string;
  setSelectedModel: (modelId: string) => void;
  status: ChatStatus;
  sendMessage: (
    message: { text: string },
    options?: { body?: Record<string, unknown> }
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
  addErrorMessage: (error: unknown) => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

interface ChatMessagesContextType {
  messages: UIMessage[];
  typewriterSpeed: number;
  isChatInProgress: boolean;
}

interface ChatInputContextType {
  input: string;
  handleInputChange: (value: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  selectedModel: string;
  handleModelChange: (modelId: string) => void;
  models: Model[];
  isChatInProgress: boolean;
}

interface ChatSubmitControlsContextType {
  status: ChatStatus;
  isChatInProgress: boolean;
  handleStop: () => void;
}

interface ChatSuggestionsContextType {
  initialSuggestions: Suggestion[];
  suggestions: Suggestion[];
  hasUserMessages: boolean;
  handleSuggestionClick: (suggestion: string) => void;
  isLoadingSuggestions: boolean;
  isWaitingForSuggestions: boolean;
  isChatInProgress: boolean;
  stoppedSuggestions: boolean;
}

interface TypewriterContextType {
  setIsChatbotTyping: (isChatbotTyping: boolean) => void;
  chatIsStopped: boolean;
}

interface ChatShellContextType {
  handleReset: () => void;
  isFullscreen: boolean;
  toggleFullscreen: () => void;
}

interface DiagnosticContextType {
  diagnostics: ChatRequestDiagnostic[];
  selectedIndex: number;
  setSelectedIndex: (i: number) => void;
  currentDiagnostic: ChatRequestDiagnostic | null;
  isDiagnosticPanelOpen: boolean;
  toggleDiagnosticPanel: () => void;
  isFetchingDiagnostic: boolean;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);
const ChatMessagesContext = createContext<ChatMessagesContextType | undefined>(
  undefined
);
const ChatInputContext = createContext<ChatInputContextType | undefined>(
  undefined
);
const ChatSubmitControlsContext = createContext<
  ChatSubmitControlsContextType | undefined
>(undefined);
const ChatSuggestionsContext = createContext<
  ChatSuggestionsContextType | undefined
>(undefined);
const TypewriterContext = createContext<TypewriterContextType | undefined>(
  undefined
);
const ChatShellContext = createContext<ChatShellContextType | undefined>(
  undefined
);
const DiagnosticContext = createContext<DiagnosticContextType | undefined>(
  undefined
);

interface ChatProviderProps {
  children: ReactNode;
}

export function ChatProvider({ children }: ChatProviderProps) {
  const [isChatbotTyping, setIsChatbotTyping] = useState(false);
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL_ID);
  const [input, setInput] = useState("");
  const [chatIsStopped, setChatIsStopped] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [diagnostics, setDiagnostics] = useState<ChatRequestDiagnostic[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isDiagnosticPanelOpen, setIsDiagnosticPanelOpen] = useState(false);
  const [isFetchingDiagnostic, setIsFetchingDiagnostic] = useState(false);

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
    []
  );

  const {
    messages,
    sendMessage,
    status,
    setMessages,
    stop: stopChat,
  } = useChat({
    onError: (e) => {
      addErrorMessage(e);
    },
  });

  // Simple boolean derivation — useMemo overhead exceeds the computation cost
  const isChatInProgress =
    status === "submitted" || status === "streaming" || isChatbotTyping;

  // Fetch full diagnostic history after each completed response
  useEffect(() => {
    if (status !== "ready") return;
    setIsFetchingDiagnostic(true);
    fetch("/api/chat/diagnostics")
      .then((r) => r.json())
      .then((data: ChatRequestDiagnostic[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setDiagnostics(data);
          setSelectedIndex(0);
        }
      })
      .catch(() => {})
      .finally(() => setIsFetchingDiagnostic(false));
  }, [status]);

  // Function to add an error message to the chat
  const addErrorMessage = useCallback(
    (error: unknown) => {
      console.error("Chat Error:", error);
      setMessages((prevMessages) => [
        ...prevMessages,
        {
          id: nanoid(),
          role: "assistant",
          parts: [
            {
              type: "text",
              text: formatErrorMessage(error),
            },
          ],
        },
      ]);
      setIsChatbotTyping(false);
    },
    [setMessages]
  );

  // Custom hooks for suggestions
  const {
    suggestions,
    reset: resetSuggestions,
    isLoading: isLoadingSuggestions,
    isWaitingForSuggestions,
    stopped: stoppedSuggestions,
    stop: stopSuggestions,
  } = useSuggestions({
    messages,
    status,
    selectedModel,
  });

  // Initialize messages with initial message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([initialMessage]);
    }
  }, [initialMessage, setMessages, messages.length]);

  // Memoize hasUserMessages calculation
  const hasUserMessagesValue = useMemo(
    () => hasUserMessages(messages),
    [messages]
  );

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
          }
        );
        setInput("");
      }
    },
    [input, selectedModel, sendMessage]
  );

  const handleReset = useCallback(() => {
    setMessages([initialMessage]);
    stopChat();
    setInput("");
    resetSuggestions();
    setIsChatbotTyping(false);
    setDiagnostics([]);
    setSelectedIndex(0);
  }, [initialMessage, resetSuggestions, stopChat, setMessages]);

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
          }
        );
      }
    },
    [selectedModel, sendMessage, isChatInProgress]
  );

  const handleStop = useCallback(() => {
    const isRequestActive = status === "submitted" || status === "streaming";

    stopChat();
    stopSuggestions();
    setChatIsStopped(true);
    if (isRequestActive) {
      setMessages((prevMessages) =>
        markLatestTurnAsAborted(prevMessages, nanoid)
      );
    }
    setIsChatbotTyping(false);
  }, [status, stopChat, stopSuggestions, setMessages]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const chatMessagesValue: ChatMessagesContextType = useMemo(
    () => ({
      messages,
      typewriterSpeed: TYPEWRITER_SPEED,
      isChatInProgress,
    }),
    [messages, isChatInProgress]
  );

  const chatInputValue: ChatInputContextType = useMemo(
    () => ({
      input,
      handleInputChange: setInput,
      handleSubmit,
      selectedModel,
      handleModelChange: setSelectedModel,
      models: MODELS,
      isChatInProgress,
    }),
    [input, handleSubmit, selectedModel, isChatInProgress]
  );

  const chatSubmitControlsValue: ChatSubmitControlsContextType = useMemo(
    () => ({
      status,
      isChatInProgress,
      handleStop,
    }),
    [status, isChatInProgress, handleStop]
  );

  const chatSuggestionsValue: ChatSuggestionsContextType = useMemo(
    () => ({
      initialSuggestions: INITIAL_SUGGESTIONS,
      suggestions,
      hasUserMessages: hasUserMessagesValue,
      handleSuggestionClick,
      isLoadingSuggestions,
      isWaitingForSuggestions,
      isChatInProgress,
      stoppedSuggestions,
    }),
    [
      suggestions,
      hasUserMessagesValue,
      handleSuggestionClick,
      isLoadingSuggestions,
      isWaitingForSuggestions,
      isChatInProgress,
      stoppedSuggestions,
    ]
  );

  const typewriterValue: TypewriterContextType = useMemo(
    () => ({
      setIsChatbotTyping,
      chatIsStopped,
    }),
    [chatIsStopped]
  );

  const chatShellValue: ChatShellContextType = useMemo(
    () => ({
      handleReset,
      isFullscreen,
      toggleFullscreen,
    }),
    [handleReset, isFullscreen, toggleFullscreen]
  );

  const diagnosticContextValue: DiagnosticContextType = useMemo(
    () => ({
      diagnostics,
      selectedIndex,
      setSelectedIndex,
      currentDiagnostic: diagnostics[selectedIndex] ?? null,
      isDiagnosticPanelOpen,
      toggleDiagnosticPanel: () => setIsDiagnosticPanelOpen((p) => !p),
      isFetchingDiagnostic,
    }),
    [diagnostics, selectedIndex, isDiagnosticPanelOpen, isFetchingDiagnostic]
  );

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value: ChatContextType = useMemo(
    () => ({
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
      isWaitingForSuggestions,
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
      handleModelChange: setSelectedModel,
      handleInputChange: setInput,
      addErrorMessage,
      isFullscreen,
      toggleFullscreen,
    }),
    [
      isChatbotTyping,
      messages,
      setMessages,
      input,
      selectedModel,
      status,
      sendMessage,
      stopChat,
      isChatInProgress,
      suggestions,
      resetSuggestions,
      isLoadingSuggestions,
      isWaitingForSuggestions,
      stoppedSuggestions,
      stopSuggestions,
      hasUserMessagesValue,
      chatIsStopped,
      handleSubmit,
      handleReset,
      handleSuggestionClick,
      handleStop,
      addErrorMessage,
      isFullscreen,
      toggleFullscreen,
    ]
  );

  return (
    <DiagnosticContext.Provider value={diagnosticContextValue}>
      <ChatContext.Provider value={value}>
        <ChatShellContext.Provider value={chatShellValue}>
          <ChatMessagesContext.Provider value={chatMessagesValue}>
            <TypewriterContext.Provider value={typewriterValue}>
              <ChatSuggestionsContext.Provider value={chatSuggestionsValue}>
                <ChatInputContext.Provider value={chatInputValue}>
                  <ChatSubmitControlsContext.Provider
                    value={chatSubmitControlsValue}
                  >
                    {children}
                  </ChatSubmitControlsContext.Provider>
                </ChatInputContext.Provider>
              </ChatSuggestionsContext.Provider>
            </TypewriterContext.Provider>
          </ChatMessagesContext.Provider>
        </ChatShellContext.Provider>
      </ChatContext.Provider>
    </DiagnosticContext.Provider>
  );
}

function useRequiredContext<T>(
  context: Context<T | undefined>,
  hookName: string
) {
  const value = useContext(context);
  if (value === undefined) {
    throw new Error(`${hookName} must be used within a ChatProvider`);
  }
  return value;
}

export function useChatContext() {
  const context = useRequiredContext(ChatContext, "useChatContext");
  return context;
}

export function useChatMessagesContext() {
  return useRequiredContext(ChatMessagesContext, "useChatMessagesContext");
}

export function useChatInputContext() {
  return useRequiredContext(ChatInputContext, "useChatInputContext");
}

export function useChatSubmitControlsContext() {
  return useRequiredContext(
    ChatSubmitControlsContext,
    "useChatSubmitControlsContext"
  );
}

export function useChatSuggestionsContext() {
  return useRequiredContext(
    ChatSuggestionsContext,
    "useChatSuggestionsContext"
  );
}

export function useTypewriterContext() {
  return useRequiredContext(TypewriterContext, "useTypewriterContext");
}

export function useChatShellContext() {
  return useRequiredContext(ChatShellContext, "useChatShellContext");
}

export function useDiagnosticContext() {
  return useRequiredContext(DiagnosticContext, "useDiagnosticContext");
}
