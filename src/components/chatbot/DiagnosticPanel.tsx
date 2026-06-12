"use client";

import { memo, useState, useEffect, useCallback } from "react";

import {
  Activity,
  ChevronDown,
  ChevronUp,
  Clipboard,
  ClipboardCheck,
  Cpu,
  Database,
  FileText,
  Hash,
  Layers,
  MessageSquare,
  Send,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import type {
  ChatRequestDiagnostic,
  IndexDiagnostic,
  ScoredChunkDiagnostic,
} from "@/lib/rag/types";
import { cn } from "@/lib/utils";

import {
  useDiagnosticContext,
  useChatShellContext,
  useChatSubmitControlsContext,
} from "./ChatContext";

// ─── Utility components ───────────────────────────────────────────────────────

function DiagRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-2 py-0.5">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className={cn("text-right break-all", mono && "font-mono")}>
        {value}
      </span>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    score >= 0.75
      ? "bg-green-500"
      : score >= 0.55
        ? "bg-amber-500"
        : "bg-red-400";
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn("h-full rounded-full", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-muted-foreground tabular-nums w-8 text-right">
        {score.toFixed(2)}
      </span>
    </div>
  );
}

function ModeBadge({ mode }: { mode: "rag" | "full-context" | "fallback" }) {
  const styles = {
    rag: "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20",
    "full-context":
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
    fallback:
      "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  };
  return (
    <Badge
      variant="outline"
      className={cn("text-[10px] h-4 px-1", styles[mode])}
    >
      {mode}
    </Badge>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [text]);
  return (
    <button
      onClick={copy}
      className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
      aria-label="Kopieren"
    >
      {copied ? (
        <ClipboardCheck className="size-3" />
      ) : (
        <Clipboard className="size-3" />
      )}
    </button>
  );
}

function DiagnosticSection({
  title,
  icon,
  children,
  defaultOpen = true,
  badge,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className="border-b last:border-0"
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/50 transition-colors">
        <div className="flex items-center gap-1.5">
          {icon}
          {title}
          {badge}
        </div>
        {open ? (
          <ChevronUp className="size-3 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-3 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="px-3 pb-3 space-y-0.5 text-xs">{children}</div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function ChunkCard({ chunk }: { chunk: ScoredChunkDiagnostic }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded border bg-muted/30 p-2 space-y-1.5 text-xs">
      <div className="flex items-center justify-between gap-1">
        <span
          className="font-medium truncate max-w-[160px]"
          title={chunk.source}
        >
          {chunk.source}
        </span>
        <span className="text-muted-foreground shrink-0 tabular-nums">
          {chunk.chunkIndex + 1}/{chunk.totalChunks}
        </span>
      </div>
      <ScoreBar score={chunk.score} />
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>{chunk.characterCount.toLocaleString()} chars</span>
        <span>·</span>
        <span>{chunk.embeddingDimensions}d</span>
        {chunk.used && (
          <>
            <span>·</span>
            <span className="text-green-600 dark:text-green-400">
              verwendet
            </span>
          </>
        )}
      </div>
      <button
        className="text-muted-foreground hover:text-foreground transition-colors text-left w-full"
        onClick={() => setExpanded((p) => !p)}
      >
        {expanded ? (
          <span className="break-words whitespace-pre-wrap">
            {chunk.preview}
          </span>
        ) : (
          <span className="line-clamp-2">{chunk.preview}</span>
        )}
      </button>
    </div>
  );
}

/** Full raw text block with copy button and optional truncation */
function RawTextBlock({
  text,
  maxLines = 12,
}: {
  text: string;
  maxLines?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const lines = text.split("\n");
  const isLong = lines.length > maxLines || text.length > 1200;
  const displayed =
    !isLong || expanded ? text : lines.slice(0, maxLines).join("\n") + "\n…";

  return (
    <div className="relative mt-1">
      <div className="flex items-start justify-between gap-1 mb-0.5">
        <span className="text-muted-foreground tabular-nums">
          {text.length.toLocaleString()} Zeichen
        </span>
        <CopyButton text={text} />
      </div>
      <pre className="bg-muted/40 border rounded p-2 text-[10px] font-mono whitespace-pre-wrap break-all overflow-auto max-h-56 leading-relaxed">
        {displayed}
      </pre>
      {isLong && (
        <button
          onClick={() => setExpanded((p) => !p)}
          className="mt-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {expanded ? "Weniger anzeigen ↑" : "Vollständig anzeigen ↓"}
        </button>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-3 space-y-3">
      {[80, 60, 90, 50, 70].map((w, i) => (
        <Skeleton key={i} className="h-3 rounded" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

// ─── History navigation ───────────────────────────────────────────────────────

function HistoryList({
  diagnostics,
  selectedIndex,
  onSelect,
}: {
  diagnostics: ChatRequestDiagnostic[];
  selectedIndex: number;
  onSelect: (i: number) => void;
}) {
  if (diagnostics.length === 0) return null;

  return (
    <div className="border-b bg-muted/30 shrink-0">
      <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
        Verlauf ({diagnostics.length})
      </div>
      <div className="max-h-36 overflow-y-auto">
        {diagnostics.map((d, i) => {
          const isSelected = i === selectedIndex;
          const time = new Date(d.requestedAt).toLocaleTimeString("de-DE", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
          const querySnippet = d.query
            ? d.query.slice(0, 42) + (d.query.length > 42 ? "…" : "")
            : "(keine Anfrage)";

          return (
            <button
              key={d.requestId}
              onClick={() => onSelect(i)}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors",
                isSelected
                  ? "bg-primary/10 text-foreground"
                  : "hover:bg-muted/50 text-muted-foreground",
              )}
            >
              <span className="tabular-nums shrink-0 text-[10px] w-4 text-muted-foreground">
                #{diagnostics.length - i}
              </span>
              <span className="flex-1 truncate">{querySnippet}</span>
              <ModeBadge mode={d.mode} />
              <span className="tabular-nums shrink-0 text-[10px]">{time}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Detail content for one diagnostic ───────────────────────────────────────

function DiagnosticDetail({ d }: { d: ChatRequestDiagnostic }) {
  return (
    <>
      {/* Request Overview */}
      <DiagnosticSection title="Request" icon={<Hash className="size-3" />}>
        <DiagRow label="ID" value={d.requestId} mono />
        <DiagRow
          label="Modell"
          value={
            <Badge variant="outline" className="text-[10px] h-4 px-1">
              {d.model.split("/").pop()}
            </Badge>
          }
        />
        <DiagRow label="Modus" value={<ModeBadge mode={d.mode} />} />
        <DiagRow
          label="Zeitstempel"
          value={new Date(d.requestedAt).toLocaleTimeString("de-DE")}
        />
        <DiagRow
          label="Nachrichten"
          value={`${d.messageCountAfterFilter ?? "–"} / ${d.messageCountBeforeFilter ?? "–"} gesendet`}
        />
        {d.fallbackReason && (
          <DiagRow
            label="Fallback"
            value={
              <span className="text-amber-600 dark:text-amber-400 break-all">
                {d.fallbackReason}
              </span>
            }
          />
        )}
      </DiagnosticSection>

      {/* Gesendet an LLM */}
      <DiagnosticSection
        title="Gesendet an LLM"
        icon={<Send className="size-3" />}
        defaultOpen={true}
      >
        {/* System Context */}
        <p className="font-medium text-foreground pt-0.5 pb-0.5">
          System-Kontext
        </p>
        {d.systemContextFull ? (
          <RawTextBlock text={d.systemContextFull} maxLines={10} />
        ) : (
          <p className="text-muted-foreground italic">Kein System-Kontext.</p>
        )}

        {/* Messages */}
        {d.sentMessages && d.sentMessages.length > 0 && (
          <>
            <p className="font-medium text-foreground pt-2 pb-0.5">
              Nachrichten ({d.sentMessages.length})
            </p>
            <div className="space-y-1.5 pt-0.5">
              {d.sentMessages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded border p-1.5 text-[10px]",
                    msg.role === "user"
                      ? "bg-primary/5 border-primary/20"
                      : "bg-muted/40 border-border",
                  )}
                >
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[9px] h-3.5 px-1",
                        msg.role === "user"
                          ? "border-primary/30 text-primary"
                          : "border-border text-muted-foreground",
                      )}
                    >
                      {msg.role === "user" ? "User" : "Assistant"}
                    </Badge>
                    <CopyButton text={msg.content} />
                  </div>
                  <p className="whitespace-pre-wrap break-all leading-relaxed">
                    {msg.content.slice(0, 300)}
                    {msg.content.length > 300 && (
                      <span className="text-muted-foreground">
                        {" "}
                        …({msg.content.length.toLocaleString()} Zeichen)
                      </span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </>
        )}
      </DiagnosticSection>

      {/* Antwort vom LLM */}
      <DiagnosticSection
        title="Antwort vom LLM"
        icon={<MessageSquare className="size-3" />}
        defaultOpen={true}
      >
        {d.responseText ? (
          <RawTextBlock text={d.responseText} maxLines={14} />
        ) : (
          <p className="text-muted-foreground italic pt-1">
            Noch keine Antwort.
          </p>
        )}
        {d.finishReason && (
          <div className="pt-1.5">
            <DiagRow
              label="Abschluss"
              value={
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] h-4 px-1",
                    d.finishReason === "stop"
                      ? "text-green-700 dark:text-green-400"
                      : "text-amber-700 dark:text-amber-400",
                  )}
                >
                  {d.finishReason}
                </Badge>
              }
            />
            {d.responseDurationMs !== undefined && (
              <DiagRow
                label="Antwortzeit"
                value={`${d.responseDurationMs.toLocaleString()} ms`}
                mono
              />
            )}
            {d.tokenUsage && (
              <>
                <DiagRow
                  label="Input-Tokens"
                  value={d.tokenUsage.inputTokens?.toLocaleString() ?? "–"}
                  mono
                />
                <DiagRow
                  label="Output-Tokens"
                  value={d.tokenUsage.outputTokens?.toLocaleString() ?? "–"}
                  mono
                />
                {d.tokenUsage.inputTokens !== undefined &&
                  d.tokenUsage.outputTokens !== undefined && (
                    <DiagRow
                      label="Gesamt-Tokens"
                      value={(
                        d.tokenUsage.inputTokens + d.tokenUsage.outputTokens
                      ).toLocaleString()}
                      mono
                    />
                  )}
              </>
            )}
          </div>
        )}
      </DiagnosticSection>

      {/* RAG Context */}
      <DiagnosticSection
        title="RAG Context"
        icon={<Database className="size-3" />}
        defaultOpen={false}
      >
        {d.query && (
          <DiagRow
            label="Anfrage"
            value={<span className="line-clamp-2 text-right">{d.query}</span>}
          />
        )}
        <DiagRow label="Abruf" value={`${d.retrievalDurationMs} ms`} mono />
        <DiagRow
          label="Kandidaten"
          value={`${d.retrieval.candidates.length} / ${d.config.topK}`}
        />
        <DiagRow
          label="Verwendet"
          value={`${d.retrieval.usedChunks.length} Chunks`}
        />
        <DiagRow
          label="Min. Ähnlichkeit"
          value={d.config.minSimilarity.toString()}
          mono
        />
        <DiagRow
          label="Embedding-Modell"
          value={d.config.embeddingModel}
          mono
        />
      </DiagnosticSection>

      {/* Prompt Stats */}
      <DiagnosticSection
        title="Prompt"
        icon={<FileText className="size-3" />}
        defaultOpen={false}
      >
        <DiagRow
          label="System-Prompt"
          value={
            d.prompt.systemPromptIncluded ? (
              <span className="text-green-600 dark:text-green-400">
                enthalten
              </span>
            ) : (
              <span className="text-muted-foreground">fehlt</span>
            )
          }
        />
        <DiagRow
          label="Kontext"
          value={`${d.prompt.systemContextCharacters.toLocaleString()} Zeichen`}
        />
        <DiagRow
          label="RAG-Kontext"
          value={`${d.prompt.ragContextCharacters.toLocaleString()} Zeichen`}
        />
        <DiagRow
          label="RAG-Tokens"
          value={`${d.prompt.ragContextTokens} / ${d.config.maxContextTokens}`}
          mono
        />
      </DiagnosticSection>

      {/* Chunks */}
      <DiagnosticSection
        title="Chunks"
        icon={<Layers className="size-3" />}
        defaultOpen={false}
        badge={
          <Badge variant="secondary" className="text-[10px] h-4 px-1 ml-1">
            {d.retrieval.usedChunks.length} / {d.retrieval.candidates.length}
          </Badge>
        }
      >
        {d.retrieval.candidates.length === 0 ? (
          <p className="text-muted-foreground py-1">
            Keine Kandidaten gefunden.
          </p>
        ) : (
          <div className="space-y-2 pt-1">
            {d.retrieval.candidates.map((chunk) => (
              <ChunkCard key={chunk.id} chunk={chunk} />
            ))}
          </div>
        )}
      </DiagnosticSection>

      {/* LLM Config */}
      <DiagnosticSection
        title="Konfiguration"
        icon={<Cpu className="size-3" />}
        defaultOpen={false}
      >
        <DiagRow label="topK" value={d.config.topK} mono />
        <DiagRow label="minSimilarity" value={d.config.minSimilarity} mono />
        <DiagRow
          label="maxContextTokens"
          value={d.config.maxContextTokens}
          mono
        />
        <DiagRow label="chunkTokens" value={d.config.chunkTokens} mono />
        <DiagRow
          label="chunkOverlapTokens"
          value={d.config.chunkOverlapTokens}
          mono
        />
      </DiagnosticSection>
    </>
  );
}

// ─── Index Status (persistent, fetched once per panel open) ──────────────────

function IndexStatusSection() {
  const [indexStatus, setIndexStatus] = useState<Omit<
    IndexDiagnostic,
    "files" | "chunks"
  > | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch("/api/rag/diagnostics")
      .then((r) => r.json())
      .then((d: IndexDiagnostic) => {
        setIndexStatus({
          indexed: d.indexed,
          version: d.version,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
          fileCount: d.fileCount,
          chunkCount: d.chunkCount,
          chunksWithEmbeddings: d.chunksWithEmbeddings,
        });
      })
      .catch(() => setIndexStatus(null))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="border-t">
      <DiagnosticSection
        title="Index-Status"
        icon={<Zap className="size-3" />}
        defaultOpen={false}
      >
        {loading ? (
          <LoadingSkeleton />
        ) : indexStatus ? (
          <>
            <DiagRow
              label="Indiziert"
              value={
                indexStatus.indexed ? (
                  <span className="text-green-600 dark:text-green-400">ja</span>
                ) : (
                  <span className="text-destructive">nein</span>
                )
              }
            />
            {indexStatus.version && (
              <DiagRow label="Version" value={indexStatus.version} mono />
            )}
            <DiagRow label="Dateien" value={indexStatus.fileCount} />
            <DiagRow label="Chunks" value={indexStatus.chunkCount} />
            <DiagRow
              label="Mit Embeddings"
              value={`${indexStatus.chunksWithEmbeddings} / ${indexStatus.chunkCount}`}
            />
            {indexStatus.updatedAt && (
              <DiagRow
                label="Aktualisiert"
                value={new Date(indexStatus.updatedAt).toLocaleString("de-DE")}
              />
            )}
          </>
        ) : (
          <p className="text-muted-foreground py-1 text-xs">Nicht verfügbar.</p>
        )}
      </DiagnosticSection>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export const DiagnosticPanel = memo(function DiagnosticPanel() {
  const {
    diagnostics,
    selectedIndex,
    setSelectedIndex,
    currentDiagnostic,
    isDiagnosticPanelOpen,
    toggleDiagnosticPanel,
    isFetchingDiagnostic,
  } = useDiagnosticContext();
  const { isFullscreen } = useChatShellContext();
  const { isChatInProgress } = useChatSubmitControlsContext();

  if (!isDiagnosticPanelOpen) return null;

  const showSkeleton =
    (isChatInProgress || isFetchingDiagnostic) && !currentDiagnostic;

  return (
    <div className="bg-card border rounded-xl shadow-xl flex flex-col h-full overflow-hidden w-[360px] shrink-0">
      {/* Header */}
      <div className="bg-muted/50 flex items-center justify-between border-b px-3 py-1 shrink-0">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Activity className="size-3" />
          Diagnostics
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={toggleDiagnosticPanel}
          className="h-fit py-1 px-1.5"
          aria-label="Diagnostics schließen"
        >
          <X className="size-3" />
        </Button>
      </div>

      {/* History navigation */}
      <HistoryList
        diagnostics={diagnostics}
        selectedIndex={selectedIndex}
        onSelect={setSelectedIndex}
      />

      {/* Content */}
      <ScrollArea className="flex-1">
        {/* Empty state */}
        {!currentDiagnostic && !showSkeleton && (
          <div className="flex flex-col items-center justify-center h-32 gap-2 text-muted-foreground">
            <Activity className="size-5 opacity-40" />
            <p className="text-xs">
              Sende eine Nachricht, um Diagnostik zu sehen.
            </p>
          </div>
        )}

        {/* Loading skeleton */}
        {showSkeleton && <LoadingSkeleton />}

        {/* Loading overlay while fetching newer data */}
        {(isChatInProgress || isFetchingDiagnostic) && currentDiagnostic && (
          <div className="px-3 pt-2 pb-0">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
              <div className="size-1.5 rounded-full bg-primary animate-pulse" />
              Aktualisiere…
            </div>
          </div>
        )}

        {/* Diagnostic detail */}
        {currentDiagnostic && <DiagnosticDetail d={currentDiagnostic} />}

        {/* Index status (always at bottom) */}
        <IndexStatusSection />
      </ScrollArea>
    </div>
  );
});
