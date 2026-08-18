"use client";

import { useEffect, useState } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { CompareResult } from "@/types";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import AILoader from "@/components/smoothui/AILoader";
import AIReasoning from "@/components/smoothui/AIReasoning";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getProviderDisplayName } from "@/lib/models";

interface CompareCardProps {
  side: "a" | "b";
  model: string;
  result: CompareResult;
  onUse: () => void;
  /** Scroll the compare arena so this card's latest content stays visible. */
  onAutoScroll?: () => void;
  /** Extra classes for the card root (used by the compare arena layout). */
  className?: string;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

function modelShortName(modelId: string): string {
  const parts = modelId.split("/");
  const name = (parts[1] ?? modelId)
    .replace(/:free$/, "")
    .replace(/:beta$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${getProviderDisplayName(parts[0] ?? "")} · ${name}`;
}

export default function CompareCard({
  side,
  model,
  result,
  onUse,
  onAutoScroll,
  className,
}: CompareCardProps) {
  const [showErrorDetail, setShowErrorDetail] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const isLeft = side === "a";

  // Live elapsed timer while this side is streaming
  useEffect(() => {
    if (!result.isStreaming || !result.startedAt) return;
    setElapsed(Date.now() - result.startedAt);
    const id = setInterval(
      () => setElapsed(Date.now() - (result.startedAt ?? Date.now())),
      1000,
    );
    return () => clearInterval(id);
  }, [result.isStreaming, result.startedAt]);

  // Auto-scroll the arena while streaming (the callback checks "near bottom")
  useEffect(() => {
    onAutoScroll?.();
  }, [result.content, result.reasoning, onAutoScroll]);

  const waitingForFirstTokens =
    result.isStreaming && !result.content && !result.reasoning;
  const done = !result.isStreaming && !result.isError;
  const totalMs = (result.finishedAt ?? 0) - (result.startedAt ?? 0);

  return (
    <div
      className={cn(
        "flex flex-col rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-secondary overflow-hidden shadow-sm",
        className,
      )}
    >
      {/* ── Card header: model + status ────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-neutral-200/60 dark:border-dark-border/40 flex-shrink-0">
        <span
          className={cn(
            "size-1.5 rounded-full flex-shrink-0",
            isLeft ? "bg-emerald-500" : "bg-blue-500",
          )}
          aria-hidden
        />
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wide text-ink-muted dark:text-neutral-600">
            {isLeft ? "Model A" : "Model B"}
          </p>
          <p className="text-xs font-semibold text-ink dark:text-neutral-100 truncate">
            {modelShortName(model)}
          </p>
        </div>

        {/* Status chip */}
        <div className="flex-shrink-0 flex items-center gap-1.5 text-[10px] font-medium">
          {result.isStreaming ? (
            <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="tabular-nums">{formatElapsed(elapsed)}</span>
            </span>
          ) : result.isError ? (
            <span className="flex items-center gap-1 text-red-500">
              <AlertTriangle className="size-3" />
              failed
            </span>
          ) : result.content ? (
            <span className="flex items-center gap-1 text-ink-muted dark:text-neutral-600">
              <Check className="size-3 text-emerald-500" />
              <span className="tabular-nums">{formatElapsed(totalMs)}</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* ── Body — grows with content; the arena scrolls the page ─────── */}
      <div className="px-3 py-2.5">
        {waitingForFirstTokens && (
          <AILoader
            variant="dots"
            showElapsed
            label="Thinking"
            className="py-1"
          />
        )}

        {result.reasoning && (
          <AIReasoning
            isStreaming={result.isStreaming && !result.content}
            duration={result.reasoningDuration}
            className="mb-1.5"
          >
            {result.reasoning}
          </AIReasoning>
        )}

        {result.content ? (
          result.isError ? (
            <div className="px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <div className="flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="size-3.5 text-red-500 flex-shrink-0" />
                <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                  Something went wrong
                </span>
                {result.errorDetail && (
                  <button
                    type="button"
                    onClick={() => setShowErrorDetail((v) => !v)}
                    aria-expanded={showErrorDetail}
                    aria-label={
                      showErrorDetail
                        ? "Hide full error details"
                        : "Show full error details"
                    }
                    className={cn(
                      "ml-auto flex-shrink-0 size-5 rounded-full flex items-center justify-center",
                      "text-[11px] font-bold leading-none cursor-pointer transition-colors",
                      "bg-red-200/70 dark:bg-red-900/50 text-red-700 dark:text-red-300",
                      "hover:bg-red-300/70 dark:hover:bg-red-800/50",
                    )}
                  >
                    !
                  </button>
                )}
              </div>
              <MarkdownRenderer
                content={result.content}
                className="text-red-700 dark:text-red-300 selectable"
              />
              {showErrorDetail && result.errorDetail && (
                <pre className="mt-2 rounded-lg bg-red-100/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 px-3 py-2 text-[11px] leading-relaxed text-red-800 dark:text-red-300 whitespace-pre-wrap break-words font-mono selectable">
                  {result.errorDetail}
                </pre>
              )}
            </div>
          ) : (
            <MarkdownRenderer
              content={result.content}
              isStreaming={result.isStreaming}
              className="selectable"
            />
          )
        ) : (
          !waitingForFirstTokens && (
            <div className="py-8 text-center">
              <p className="text-xs text-ink-muted dark:text-neutral-600">
                Type a message below to compare both models side by side.
              </p>
            </div>
          )
        )}
      </div>

      {/* ── Footer: adopt this answer ──────────────────────────────────── */}
      {done && result.content && (
        <div className="flex-shrink-0 border-t border-neutral-200/60 dark:border-dark-border/40 px-2.5 py-2">
          <Button variant="primary" size="xs" onClick={onUse} className="w-full">
            <Check className="size-3" />
            Use this response
          </Button>
        </div>
      )}
    </div>
  );
}
