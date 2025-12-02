"use client";

import { memo, useState, useEffect } from "react";

import copy from "copy-to-clipboard";
import { CopyIcon, CheckIcon } from "lucide-react";

import { useChatContext } from "./ChatContext";
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
import { extractTextFromMessage, isMessageEmpty } from "@/lib/chatUtils";
import { USER_AVATAR_URL, ASSISTANT_AVATAR_URL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * ChatMessages component - renders the conversation messages.
 * Memoized for performance optimization to prevent unnecessary re-renders.
 */
export const ChatMessages = memo(function ChatMessages() {
  const actions = [
    {
      icon: CopyIcon,
      label: "Copy",
      onClick: (textParts: string) => handleCopy(textParts),
      iconThenClicked: CheckIcon,
    },
  ];

  const { messages, typewriterSpeed, isChatInProgress } = useChatContext();
  const [copied, setCopied] = useState(false);
  const [showLoadingIndicator, setShowLoadingIndicator] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (
      isChatInProgress &&
      messages.length > 0 &&
      messages[messages.length - 1]?.role === "user"
    ) {
      timer = setTimeout(() => {
        setShowLoadingIndicator(true);
      }, 500); // 500ms delay
    } else {
      setTimeout(() => {
        setShowLoadingIndicator(false);
      }, 500);
    }
    return () => clearTimeout(timer);
  }, [isChatInProgress, messages]);

  const handleCopy = (textParts: string) => {
    setCopied(true);
    copy(textParts);
    setTimeout(() => setCopied(false), 1000);
  };

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
                <Message className="group p-0 pb-8" from={message.role}>
                  <div className="relative flex flex-col gap-0">
                    <MessageContent>
                      {isChatInProgress &&
                      isEmpty &&
                      message.role === "assistant" ? (
                        <div className="flex items-center gap-2">
                          <Loader size={14} />
                          <span className="text-muted-foreground text-sm">
                            Thinking...
                          </span>
                        </div>
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
                    {message.role === "assistant" && (
                      <Actions className="absolute -bottom-8 left-0 mt-2 transition-opacity duration-300 group-hover:opacity-100 sm:opacity-0">
                        {actions.map((action) => (
                          <Action
                            tooltip={copied ? "Copied!" : action.label}
                            onClick={() => handleCopy(textParts)}
                            className="size-6"
                            key={action.label}
                            label={action.label}
                          >
                            {copied ? (
                              <action.iconThenClicked className="size-3" />
                            ) : (
                              <action.icon className="size-3" />
                            )}
                          </Action>
                        ))}
                      </Actions>
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
        {/* Show loading state immediately when user sends a message, before assistant message exists */}
        {isChatInProgress &&
          showLoadingIndicator &&
          messages.length > 0 &&
          messages[messages.length - 1]?.role === "user" &&
          !messages.some(
            (msg) => msg.role === "assistant" && isMessageEmpty(msg)
          ) && (
            <div className="space-y-3">
              <BlurFade>
                <Message className="" from="assistant">
                  <MessageContent className="">
                    <div className="flex items-center gap-2">
                      <Loader size={14} />
                      <span className="text-muted-foreground text-sm">
                        Thinking...
                      </span>
                    </div>
                  </MessageContent>
                  <MessageAvatar
                    src={ASSISTANT_AVATAR_URL}
                    className="bg-primary p-1"
                    name="AI"
                  />
                </Message>
              </BlurFade>
            </div>
          )}
      </ConversationContent>
      <ConversationScrollButton />
    </Conversation>
  );
});
