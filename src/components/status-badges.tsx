import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const StatusBadge = ({
  status,
  hasUserMessages,
  chatIsStopped,
  isChatbotTyping,
  isLoadingSuggestions,
  disabled,
  isChatInProgress,
  stoppedSuggestions,
}: {
  status: string;
  hasUserMessages: boolean;
  chatIsStopped: boolean;
  isChatbotTyping: boolean;
  isLoadingSuggestions: boolean;
  disabled: boolean;
  isChatInProgress: boolean;
  stoppedSuggestions: boolean;
}) => {
  return (
    <>
      {(() => {
        // Map status values to colors
        const statusColorMap: Record<string, string> = {
          submitted: "bg-blue-500 text-white",
          streaming: "bg-yellow-500 text-white",
          ready: "bg-green-500 text-white",
          error: "bg-red-500 text-white",
        };
        const colorClass =
          status && statusColorMap[status]
            ? statusColorMap[status]
            : "bg-gray-400 text-white";
        return (
          <Badge className={cn("text-muted-foreground text-xs", colorClass)}>
            {status}
          </Badge>
        );
      })()}
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          hasUserMessages ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {hasUserMessages ? "hasUserMessages: true" : "hasUserMessages: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          chatIsStopped ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {chatIsStopped ? "chatIsStopped: true" : "chatIsStopped: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatbotTyping ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {isChatbotTyping ? "isChatbotTyping: true" : "isChatbotTyping: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isLoadingSuggestions
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}
      >
        {isLoadingSuggestions
          ? "isLoadingSuggestions: true"
          : "isLoadingSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          disabled ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {disabled ? "DisabledSuggestions: true" : "DisabledSuggestions: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          isChatInProgress ? "bg-green-500 text-white" : "bg-red-500 text-white"
        )}
      >
        {isChatInProgress
          ? "isChatInProgress: true"
          : "isChatInProgress: false"}
      </Badge>
      <Badge
        className={cn(
          "text-muted-foreground text-xs",
          stoppedSuggestions
            ? "bg-green-500 text-white"
            : "bg-red-500 text-white"
        )}
      >
        {stoppedSuggestions
          ? "stoppedSuggestions: true"
          : "stoppedSuggestions: false"}
      </Badge>
    </>
  );
};

// export const StatusBadges = ({ values }: { values: boolean[] }) => {
//   return (
//     <div className="flex gap-2">
//       {values.map((value, i) => (
//         <Badge
//           key={i}
//           className={cn(
//             "text-muted-foreground text-xs",
//             value ? "bg-green-500 text-white" : "bg-red-500 text-white"
//           )}
//         >
//           {value} {value ? "true" : "false"}
//         </Badge>
//       ))}
//     </div>
//   );
// };

export const StatusBadges = ({
  values,
}: {
  values: Record<string, boolean>;
}) => {
  return (
    <>
      {Object.entries(values).map(([name, value]) => (
        <Badge
          key={name}
          className={cn(
            "text-muted-foreground text-xs",
            value ? "bg-green-500 text-white" : "bg-red-500 text-white"
          )}
        >
          {name}: {value ? "true" : "false"}
        </Badge>
      ))}
    </>
  );
};
