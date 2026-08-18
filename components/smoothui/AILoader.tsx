"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

// One shared cycle length for every variant, so loaders that appear together
// stay in sync — two loaders running at different tempos read as two unrelated
// things loading.
export const AI_LOADER_CYCLE_SECONDS = 1.6;

export interface AILoaderProps {
  variant?: "dots" | "bar" | "grid";
  /** Live elapsed counter for waits that run long — real time is honest. */
  showElapsed?: boolean;
  label?: string;
  className?: string;
}

function formatElapsed(seconds: number): string {
  const s = Math.floor(seconds);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

// ── Animated variants ─────────────────────────────────────────────────────────

function Dots() {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500"
          animate={{ scale: [0.5, 1, 0.5], opacity: [0.3, 1, 0.3] }}
          transition={{
            duration: AI_LOADER_CYCLE_SECONDS,
            repeat: Infinity,
            delay: (i * AI_LOADER_CYCLE_SECONDS) / 3,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// The bar sweeps — it never fills. A determinate progress bar for a wait of
// unknown length promises a finish time nobody knows.
function Bar() {
  return (
    <div
      className="relative h-1 w-14 overflow-hidden rounded-full bg-neutral-200 dark:bg-dark-quaternary"
      aria-hidden="true"
    >
      <motion.div
        className="absolute top-0 h-full w-1/3 rounded-full bg-neutral-500 dark:bg-neutral-400"
        animate={{ left: ["-35%", "105%"] }}
        transition={{
          duration: AI_LOADER_CYCLE_SECONDS,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}

function Grid() {
  return (
    <div className="grid grid-cols-3 gap-1" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <motion.span
          key={i}
          className="size-1.5 rounded-[2px] bg-neutral-400 dark:bg-neutral-500"
          animate={{ opacity: [0.15, 1, 0.15] }}
          transition={{
            duration: AI_LOADER_CYCLE_SECONDS,
            repeat: Infinity,
            delay: (i * AI_LOADER_CYCLE_SECONDS) / 9,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

// ── Static states for reduced motion — legible, not animated ─────────────────

function DotsStatic() {
  return (
    <div className="flex items-center gap-1" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full bg-neutral-400 dark:bg-neutral-500 opacity-60"
        />
      ))}
    </div>
  );
}

function BarStatic() {
  return (
    <div
      className="relative h-1 w-14 overflow-hidden rounded-full bg-neutral-200 dark:bg-dark-quaternary"
      aria-hidden="true"
    >
      <div className="absolute left-1/3 top-0 h-full w-1/3 rounded-full bg-neutral-500 dark:bg-neutral-400 opacity-70" />
    </div>
  );
}

function GridStatic() {
  return (
    <div className="grid grid-cols-3 gap-1" aria-hidden="true">
      {Array.from({ length: 9 }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "size-1.5 rounded-[2px] bg-neutral-400 dark:bg-neutral-500",
            i % 3 === 1 ? "opacity-90" : "opacity-30",
          )}
        />
      ))}
    </div>
  );
}

export default function AILoader({
  variant = "dots",
  showElapsed = false,
  label = "Working",
  className,
}: AILoaderProps) {
  const reduce = useReducedMotion() ?? false;
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number | null>(null);

  useEffect(() => {
    if (!showElapsed) return;
    if (startRef.current === null) startRef.current = Date.now();
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - (startRef.current ?? Date.now())) / 1000)),
      1000,
    );
    return () => clearInterval(id);
  }, [showElapsed]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-center gap-2.5 text-xs font-medium text-ink-secondary dark:text-neutral-400 select-none",
        className,
      )}
    >
      {variant === "dots" && (reduce ? <DotsStatic /> : <Dots />)}
      {variant === "bar" && (reduce ? <BarStatic /> : <Bar />)}
      {variant === "grid" && (reduce ? <GridStatic /> : <Grid />)}
      <span>{label}…</span>
      {showElapsed && (
        <span className="tabular-nums text-ink-muted dark:text-neutral-500">
          {formatElapsed(elapsed)}
        </span>
      )}
    </div>
  );
}
