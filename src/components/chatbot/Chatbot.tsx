"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

import { ChatProvider, useChatShellContext } from "./ChatContext";
import { ChatHeader } from "./ChatHeader";
import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";
import { ChatSuggestions } from "./ChatSuggestions";
import { DiagnosticPanel } from "./DiagnosticPanel";

import { CHATBOT_TITLE } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Main Chatbot component - orchestrates all sub-components and manages state.
 * Refactored for better performance, maintainability, and code quality.
 */


const ChatbotContent = () => {
  const { isFullscreen, toggleFullscreen } = useChatShellContext();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Exit fullscreen on ESC key
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isFullscreen, toggleFullscreen]);

  // Disable scrolling on body when fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isFullscreen]);

  const chatbotLayout = (
    <motion.div
      layout
      layoutId="chatbot-window"
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className={cn(
        isFullscreen
          ? "fixed inset-0 z-[99] h-[calc(100dvh-0rem)] w-[calc(100vw-0rem)]  p-2 "
          : "h-full w-full rounded-xl "
      )}
    >

      <div
        className="bg-card relative flex flex-col overflow-hidden shadow-xl border rounded-xl h-full"
      >
        <ChatHeader
          title={CHATBOT_TITLE}
        />

        <ChatMessages />

        <ChatSuggestions />

        <ChatInput />
      </div>

    </motion.div>

  );

  if (isFullscreen && mounted) {
    return createPortal(chatbotLayout, document.body);
  }

  return chatbotLayout;
};

export const Chatbot = () => {
  return (
    <ChatProvider>
      <div className="flex h-full w-full gap-2 items-stretch">
        <div className="flex-1 min-w-0">
          <ChatbotContent />
        </div>
        <DiagnosticPanel />
      </div>
    </ChatProvider>
  );
};
