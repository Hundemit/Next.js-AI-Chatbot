"use client";

import { memo } from "react";

import { FlaskConical, Maximize, Minimize2, RotateCcwIcon, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useChatShellContext, useDiagnosticContext } from "./ChatContext";

interface ChatHeaderProps {
  title: string;
}

/**
 * ChatHeader component - displays browser-style header with dots, title, and reset button.
 * Memoized for performance optimization.
 */
export const ChatHeader = memo(function ChatHeader({ title }: ChatHeaderProps) {
  const { handleReset, isFullscreen, toggleFullscreen } = useChatShellContext();
  const { isDiagnosticPanelOpen, toggleDiagnosticPanel } = useDiagnosticContext();

  return (
    <div className="bg-muted/50 relative flex items-center justify-between border-b px-2 py-1">
      {/* Name of the chatbot */}
      <span className="absolute left-1/2 w-fit -translate-x-1/2 text-sm font-medium flex gap-1 items-center">
        {title}
        <Sparkles className="size-3" />
      </span>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleFullscreen}
          className="group h-fit gap-0 py-1 px-1.5 text-xs "
          aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="size-3 transition-all duration-300 group-hover:scale-110 text-primary/60" />
          ) : (
            <Maximize className="size-3 transition-all duration-300 group-hover:-rotate-90 text-primary/60" />
          )}
          <span className="ml-1 overflow-hidden duration-300 group-hover:ml-1 sm:ml-0 sm:w-0 md:group-hover:w-16 text-primary/60">
            {isFullscreen ? "Minimize" : "Fullscreen"}
          </span>
        </Button>
        <Button
          size="sm"
          variant={isDiagnosticPanelOpen ? "secondary" : "ghost"}
          onClick={toggleDiagnosticPanel}
          className="group h-fit gap-0 py-1 px-1.5 text-xs"
          aria-label={isDiagnosticPanelOpen ? "Diagnostics schließen" : "Diagnostics öffnen"}
        >
          <FlaskConical className="size-3 transition-all duration-300 text-primary/60" />
          <span className="ml-1 overflow-hidden duration-300 sm:ml-0 sm:w-0 md:group-hover:w-20 text-primary/60">
            Diagnostics
          </span>
        </Button>
      </div>

      {/* Reset button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={handleReset}
        className="group h-fit gap-0 py-1 px-1.5 text-xs"
        aria-label="Reset conversation"
      >
        <RotateCcwIcon className="size-3 transition-all duration-300 group-hover:-rotate-90 text-primary/60" />
        <span className="ml-1 overflow-hidden duration-300 group-hover:ml-1 sm:ml-0 sm:w-0 md:group-hover:w-8 text-primary/60">
          Reset
        </span>
      </Button>
    </div>
  );
});
