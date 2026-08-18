"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Brain, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AIReasoningProps {
  /** True while the reasoning trace is still being produced. */
  isStreaming?: boolean;
  /** Seconds the trace took, if you already measured it externally. */
  duration?: number;
  /** Collapse the trace ~600ms after it finishes (default true). */
  collapseWhenDone?: boolean;
  defaultOpen?: boolean;
  /** Shown in place of a duration when none is known. */
  label?: string;
  className?: string;
  children?: React.ReactNode;
}

// Collapsing with a beat, not a snap — snapping shut the instant the trace ends
// feels like the content was yanked away mid-read.
const COLLAPSE_DELAY_MS = 600;

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AIReasoning({
  isStreaming = false,
  duration,
  collapseWhenDone = true,
  defaultOpen = true,
  label = "Reasoning",
  className,
  children,
}: AIReasoningProps) {
  const reduce = useReducedMotion() ?? false;
  const [isExpanded, setIsExpanded] = useState(
    () => (isStreaming ? defaultOpen : !collapseWhenDone),
  );
  const [liveElapsed, setLiveElapsed] = useState(0);
  const [settledDuration, setSettledDuration] = useState(0);
  const userTouchedRef = useRef(false);
  const startTimeRef = useRef<number | null>(null);

  // ── Timing + auto collapse ────────────────────────────────────────────────
  useEffect(() => {
    if (isStreaming) {
      if (startTimeRef.current === null) startTimeRef.current = Date.now();
      // Auto-open while thinking, unless the reader took control.
      if (!userTouchedRef.current) setIsExpanded(true);

      const id = setInterval(() => {
        setLiveElapsed(
          (Date.now() - (startTimeRef.current ?? Date.now())) / 1000,
        );
      }, 500);
      return () => clearInterval(id);
    }

    // Streaming finished — settle the measured duration.
    if (startTimeRef.current !== null) {
      setSettledDuration((Date.now() - startTimeRef.current) / 1000);
      setLiveElapsed((Date.now() - startTimeRef.current) / 1000);
      startTimeRef.current = null;
    }

    // Collapse itself after a beat. A manual open/close hands control back to
    // the reader for good.
    if (collapseWhenDone && !userTouchedRef.current) {
      const id = setTimeout(() => setIsExpanded(false), COLLAPSE_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, [isStreaming, collapseWhenDone]);

  const measured = duration ?? settledDuration;

  const summary = isStreaming
    ? `Thinking${liveElapsed > 0 ? ` · ${Math.floor(liveElapsed)}s` : ""}`
    : measured > 0
      ? `Thought for ${formatDuration(measured)}`
      : label;

  const handleToggle = () => {
    userTouchedRef.current = true;
    setIsExpanded((v) => !v);
  };

  const tracePanel = (
    <div className="mt-1.5 rounded-lg bg-neutral-100 dark:bg-dark-tertiary border border-neutral-200/60 dark:border-dark-border/50">
      <div className="max-h-48 overflow-y-auto whitespace-pre-wrap break-words px-3 py-2 text-xs leading-relaxed text-ink-secondary dark:text-neutral-400 selectable">
        {children}
      </div>
    </div>
  );

  return (
    <div className={cn("w-full", className)}>
      {/* Summary line — the trigger */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={isExpanded}
        className="flex w-full items-center gap-1.5 text-left select-none group/ai cursor-pointer"
      >
        <Brain className="size-3 text-purple-500 dark:text-purple-400 flex-shrink-0" />
        <span
          className={cn(
            "text-[11px] font-medium",
            isStreaming && !reduce
              ? // Shimmer exists ONLY while streaming — it *is* the "still
                // working" signal. Once the trace ends, the line settles.
                "bg-clip-text text-transparent bg-gradient-to-r from-neutral-500 via-neutral-200 to-neutral-500 dark:from-neutral-600 dark:via-neutral-300 dark:to-neutral-600 bg-[length:200%_auto] animate-shimmer"
              : "text-ink-secondary dark:text-neutral-400",
          )}
        >
          {summary}
        </span>
        {reduce ? (
          <span className="ml-auto text-ink-muted dark:text-neutral-600 flex-shrink-0">
            <ChevronDown
              className={cn("size-3.5 transition-colors", isExpanded && "rotate-180")}
            />
          </span>
        ) : (
          <motion.span
            className="ml-auto text-ink-muted dark:text-neutral-600 flex-shrink-0"
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="size-3.5" />
          </motion.span>
        )}
      </button>

      {/* Trace — height spring on expand, content fading slightly faster */}
      {reduce ? (
        isExpanded && tracePanel
      ) : (
        <AnimatePresence initial={false}>
          {isExpanded && (
            <motion.div
              key="trace"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{
                height: { type: "spring", stiffness: 280, damping: 30 },
                opacity: { duration: 0.18 },
              }}
              className="overflow-hidden"
            >
              {tracePanel}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
