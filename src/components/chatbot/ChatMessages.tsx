"use client";

import { memo } from "react";

import type { UIMessage } from "@ai-sdk/react";

import { BlurFade } from "@/components/ui/blur-fade";
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
import { extractTextFromMessage, isMessageEmpty } from "@/lib/chatUtils";
import { USER_AVATAR_URL, ASSISTANT_AVATAR_URL } from "@/lib/constants";

interface ChatMessagesProps {
  messages: UIMessage[];
  isLoading: boolean;
}

/**
 * ChatMessages component - renders the conversation messages.
 * Memoized for performance optimization to prevent unnecessary re-renders.
 */
export const ChatMessages = memo(function ChatMessages({
  messages,
  isLoading,
}: ChatMessagesProps) {
  return (
    <Conversation className="flex-1">
      {/* Blur gradient to the top of the conversation area */}
      <div className="from-card/90 absolute top-0 left-0 h-12 w-full bg-linear-to-b to-transparent" />
      <ConversationContent className="space-y-4">
        {messages.map((message) => {
          const textParts = extractTextFromMessage(message);
          const isEmpty = isMessageEmpty(message);

          return (
            <div key={message.id} className="space-y-3">
              <BlurFade>
                <Message className="" from={message.role}>
                  <MessageContent className="">
                    {isLoading && message.role === "assistant" && isEmpty ? (
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
                        ? USER_AVATAR_URL
                        : ASSISTANT_AVATAR_URL
                    }
                    className="p-1"
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
