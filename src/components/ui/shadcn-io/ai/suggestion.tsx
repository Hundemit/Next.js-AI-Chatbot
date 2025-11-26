"use client";

import type { ComponentProps } from "react";

import { BlurFade } from "@/components/ui/blur-fade";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea
    className="w-full overflow-x-auto bg-transparent whitespace-nowrap"
    {...props}
  >
    <div
      className={cn(
        "flex w-max flex-nowrap items-center gap-2 sm:flex-wrap",
        className,
      )}
    >
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  index: number;
  disabled?: boolean;
};

export const Suggestion = ({
  disabled,
  index,
  suggestion,
  onClick,
  className,
  variant = "outline",
  size = "sm",
  children,
  ...props
}: SuggestionProps) => {
  const handleClick = () => {
    onClick?.(suggestion);
  };

  return (
    <BlurFade cursornotallowed={disabled} delay={index * 0.1}>
      <Button
        className={cn("h-6 rounded-full px-2 text-xs shadow-none", className)}
        onClick={handleClick}
        size={size}
        type="button"
        variant={variant}
        disabled={disabled}
        {...props}
      >
        {children || suggestion}
      </Button>
    </BlurFade>
  );
};
