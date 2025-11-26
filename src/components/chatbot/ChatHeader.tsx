"use client";

import { memo } from "react";

import { RotateCcwIcon } from "lucide-react";

import { Button } from "@/components/ui/button";

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
    <div className="bg-muted/50 relative flex items-center justify-between border-b px-4 py-0.5">
      {/* Dots for the browser-style header */}
      <div className="flex items-center gap-2">
        <div className="size-2 rounded-full bg-red-500" />
        <div className="size-2 rounded-full bg-yellow-500" />
        <div className="size-2 rounded-full bg-green-500" />
      </div>
      {/* Name of the chatbot */}
      <span className="absolute left-1/2 w-fit -translate-x-1/2 text-sm font-medium">
        {title}
      </span>
      {/* Reset button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onReset}
        className="group h-fit gap-0 py-1 text-xs"
        aria-label="Reset conversation"
      >
        <RotateCcwIcon className="size-3 transition-all duration-300 group-hover:-rotate-90" />
        <span className="ml-1 overflow-hidden duration-300 group-hover:ml-1 sm:ml-0 sm:w-0 md:group-hover:w-8">
          Reset
        </span>
      </Button>
    </div>
  );
});
