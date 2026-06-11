"use client";

import { memo, useState, useCallback, useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk/react";

import copy from "copy-to-clipboard";
import { CopyIcon, CheckIcon } from "lucide-react";

import { useChatMessagesContext } from "./ChatContext";
import { TypewriterText } from "./TypewriterText";

import { BlurFade } from "@/components/ui/blur-fade";
import { Action, Actions } from "@/components/ui/shadcn-io/ai/actions";
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
import { Response } from "@/components/ui/shadcn-io/ai/response";
import {
  extractTextFromMessage,
  getAssistantLoadingState,
  isAbortNoticeMessage,
} from "@/lib/chatUtils";
import { USER_AVATAR_URL, ASSISTANT_AVATAR_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

const ASSISTANT_LOADING_MESSAGE_DELAY_SECONDS = 0.2;

const getMessageRenderKey = (
  message: UIMessage,
  previousMessage: UIMessage | undefined
) => {
  if (message.role === "assistant" && previousMessage?.role === "user") {
    return `assistant-turn-${previousMessage.id}`;
  }

  return message.id;
};

/**
 * ChatMessages component - renders the conversation messages.
 * Memoized for performance optimization to prevent unnecessary re-renders.
 */
export const ChatMessages = memo(function ChatMessages() {
  const { messages, typewriterSpeed, isChatInProgress } =
    useChatMessagesContext();

  // Track which message was just copied (per-message instead of global boolean)
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback((messageId: string, textParts: string) => {
    copy(textParts);
    setCopiedMessageId(messageId);
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedMessageId(null);
      copyTimeoutRef.current = null;
    }, 1000);
  }, []);

  // Clear any pending copy-reset timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  const assistantLoadingState = getAssistantLoadingState(
    messages,
    isChatInProgress
  );
  const pendingAssistantMessage: UIMessage | null =
    assistantLoadingState.isVisible &&
      assistantLoadingState.loadingMessageId === null &&
      assistantLoadingState.loadingAfterMessageId !== null
      ? {
        id: `assistant-loading-${assistantLoadingState.loadingAfterMessageId}`,
        role: "assistant",
        parts: [],
      }
      : null;
  const visibleMessages = pendingAssistantMessage
    ? [...messages, pendingAssistantMessage]
    : messages;

  return (
    <Conversation className="flex-1">
      {/* Blur gradient at the top of the conversation area */}
      <div className="from-card/90 absolute top-0 left-0 h-12 w-full bg-linear-to-b to-transparent" />
      <ConversationContent>
        {visibleMessages.map((message, index) => {
          const textParts = extractTextFromMessage(message);
          const isAbortNotice = isAbortNoticeMessage(message);
          const isCopied = copiedMessageId === message.id;
          const isAssistantLoading =
            assistantLoadingState.isVisible &&
            message.role === "assistant" &&
            (message.id === pendingAssistantMessage?.id ||
              message.id === assistantLoadingState.loadingMessageId);
          const animationDelay =
            isAssistantLoading && assistantLoadingState.shouldDelayLoadingMessage
              ? ASSISTANT_LOADING_MESSAGE_DELAY_SECONDS
              : 0;

          return (
            <div key={getMessageRenderKey(message, visibleMessages[index - 1])}>
              <BlurFade delay={animationDelay}>
                <Message className="group p-0 pb-4" from={message.role}>
                  <div className="relative flex flex-col gap-0">
                    <MessageContent>
                      {isAssistantLoading ? (
                        <AssistantLoadingContent />
                      ) : isAbortNotice ? (
                        <span className="text-muted-foreground text-sm">
                          {textParts}
                        </span>
                      ) : (typewriterSpeed ?? 0) > 0 &&
                        message.role === "assistant" ? (
                        <TypewriterText
                          text={textParts}
                          speed={typewriterSpeed ?? 0}
                        >
                          {(displayedText) => (
                            <Response>{displayedText}</Response>
                          )}
                        </TypewriterText>
                      ) : (
                        <Response>{textParts}</Response>
                      )}
                    </MessageContent>
                    {message.role === "assistant" &&
                      !isAbortNotice &&
                      !isAssistantLoading && (
                        <div className="sm:pt-0 pt-2 sm:absolute -bottom-2 right-2 duration-300 group-hover:opacity-100 sm:opacity-0 transition-opacity">
                          <Actions>
                            <Action
                              variant="outline"
                              tooltip={isCopied ? "Copied!" : "Copy"}
                              onClick={() => handleCopy(message.id, textParts)}
                              className="size-6 sm:size-7 max-sm:border-0 max-sm:ring-0 max-sm:shadow-none"
                              label="Copy"
                            >
                              {isCopied ? (
                                <CheckIcon className="sm:size-3 size-2" />
                              ) : (
                                <CopyIcon className="sm:size-3 size-2" />
                              )}
                            </Action>
                          </Actions>
                        </div>
                      )}
                  </div>
                  <MessageAvatar
                    src={
                      message.role === "user"
                        ? USER_AVATAR_URL
                        : ASSISTANT_AVATAR_URL
                    }
                    className={cn("bg-stone-100 p-1 hidden sm:block")}
                    name={message.role === "user" ? "User" : "AI"}
                  />
                </Message>
              </BlurFade>
            </div>
          );
        })}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
});

const AssistantLoadingContent = () => {
  return (
    <div className="flex items-center gap-2">
      <Loader size={14} />
      <span className="text-muted-foreground text-sm">Denke nach ...</span>
    </div>
  );
};
