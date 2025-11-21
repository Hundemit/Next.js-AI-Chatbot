"use client";

import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import { BlurFade } from "@/components/ui/blur-fade";

export type SuggestionsProps = ComponentProps<typeof ScrollArea>;

export const Suggestions = ({
  className,
  children,
  ...props
}: SuggestionsProps) => (
  <ScrollArea
    className="w-full overflow-x-auto whitespace-nowrap bg-transparent"
    {...props}
  >
    <div className={cn("flex w-max flex-nowrap items-center gap-2", className)}>
      {children}
    </div>
    <ScrollBar className="hidden" orientation="horizontal" />
  </ScrollArea>
);

export type SuggestionProps = Omit<ComponentProps<typeof Button>, "onClick"> & {
  suggestion: string;
  onClick?: (suggestion: string) => void;
  index: number;
};

export const Suggestion = ({
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
    <BlurFade delay={index * 0.1} key={index}>
      <Button
        className={cn(
          "cursor-pointer rounded-full px-2 h-6  text-xs",
          className
        )}
        onClick={handleClick}
        size={size}
        type="button"
        variant={variant}
        {...props}
      >
        {children || suggestion}
      </Button>
    </BlurFade>
  );
};
