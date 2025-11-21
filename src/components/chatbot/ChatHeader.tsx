"use client";

import { Button } from "@/components/ui/button";
import { RotateCcwIcon } from "lucide-react";
import { memo } from "react";

interface ChatHeaderProps {
  title: string;
  onReset: () => void;
}

/**
 * ChatHeader component - displays browser-style header with dots, title, and reset button.
 * Memoized for performance optimization.
 */
export const ChatHeader = memo(function ChatHeader({
  title,
  onReset,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-0.5 relative">
      {/* Dots for the browser-style header */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-red-500" />
        <div className="size-2 rounded-full bg-yellow-500" />
        <div className="size-2 rounded-full bg-green-500" />
      </div>
      {/* Name of the chatbot */}
      <span className="font-medium text-sm w-fit absolute left-1/2 -translate-x-1/2">
        {title}
      </span>
      {/* Reset button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onReset}
        className="text-xs gap-0 h-fit py-1 group"
        aria-label="Reset conversation"
      >
        <RotateCcwIcon className="size-3 group-hover:-rotate-90 transition-all duration-300" />
        <span className="md:group-hover:w-8 ml-1 sm:w-0 sm:ml-0 duration-300 overflow-hidden group-hover:ml-1">
          Reset
        </span>
      </Button>
    </div>
  );
});


