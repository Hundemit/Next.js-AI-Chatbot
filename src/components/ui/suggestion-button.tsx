import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BlurFade } from "./blur-fade";

export type SuggestionButtonProps = {
  suggestion: string;
  isTyping: boolean;
  submitMessage: (suggestion: string) => void;
  isLoading: boolean;
  index: number;
};

export const SuggestionButton = ({
  suggestion,
  isTyping,
  submitMessage,
  isLoading,
  index,
}: SuggestionButtonProps) => {
  return (
    <BlurFade className="h-8" delay={index}>
      <Button
        disabled={isTyping}
        size="sm"
        variant="secondary"
        onClick={() => {
          if (isLoading) return;
          submitMessage(suggestion);
        }}
        className={cn("whitespace-nowrap border rounded-full h-8")}
      >
        {suggestion}
      </Button>
    </BlurFade>
  );
};
