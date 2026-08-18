"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeftRight,
  Columns2,
  GitCompare,
  History,
  Plus,
  Rows2,
  Trash2,
  X,
} from "lucide-react";
import { useCompareStore, CompareLayout } from "@/store/compareStore";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useModels } from "@/hooks/useModels";
import { CompareResult, CompareSide } from "@/types";
import { cn, formatRelativeTime } from "@/lib/utils";
import CompareCard from "./CompareCard";
import ModelPicker from "./ModelPicker";
import Tooltip from "@/components/ui/Tooltip";

const LAYOUT_OPTIONS: Array<{
  value: CompareLayout;
  label: string;
  icon: typeof Columns2;
}> = [
  {
    value: "left-right",
    label: "Left–right (swipe / side by side)",
    icon: Columns2,
  },
  {
    value: "up-down",
    label: "Up–down (stacked)",
    icon: Rows2,
  },
];

const EMPTY_RESULT: CompareResult = {
  model: "",
  content: "",
  reasoning: "",
  isStreaming: false,
  isError: false,
  startedAt: null,
  finishedAt: null,
};

function modelShortName(modelId: string): string {
  const parts = modelId.split("/");
  const name = (parts[1] ?? modelId)
    .replace(/:free$/, "")
    .replace(/:beta$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${parts[0] ?? ""} · ${name}`;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

interface CompareViewProps {
  onUse: (side: CompareSide) => void;
}

export default function CompareView({ onUse }: CompareViewProps) {
  const { allModels, isLoading } = useModels();
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const pickerModelA = useCompareStore((s) => s.pickerModelA);
  const pickerModelB = useCompareStore((s) => s.pickerModelB);
  const setPickerModelA = useCompareStore((s) => s.setPickerModelA);
  const setPickerModelB = useCompareStore((s) => s.setPickerModelB);
  const swapModels = useCompareStore((s) => s.swapModels);
  const compareLayout = useCompareStore((s) => s.compareLayout);
  const setCompareLayout = useCompareStore((s) => s.setCompareLayout);
  const session = useCompareStore((s) => s.session);
  const history = useCompareStore((s) => s.history);
  const setCompareMode = useUIStore((s) => s.setCompareMode);

  const [showHistory, setShowHistory] = useState(false);
  const [activeCard, setActiveCard] = useState(0);
  const toolbarRef = useRef<HTMLDivElement>(null);
  // The arena itself is the scroll container — touch/wheel anywhere scrolls
  const arenaRef = useRef<HTMLDivElement>(null);
  // Swipe pager for left-right mode on mobile
  const pagerRef = useRef<HTMLDivElement>(null);

  // Track which card is in view as the user swipes
  const handlePagerScroll = useCallback(() => {
    const el = pagerRef.current;
    if (!el) return;
    setActiveCard(
      el.scrollLeft > (el.scrollWidth - el.clientWidth) / 2 ? 1 : 0,
    );
  }, []);

  const jumpToCard = useCallback((index: number) => {
    const el = pagerRef.current;
    if (!el) return;
    el.scrollTo({ left: index === 0 ? 0 : el.scrollWidth, behavior: "smooth" });
  }, []);

  // Close the history popover on outside click / Escape
  useEffect(() => {
    if (!showHistory) return;
    const onDown = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHistory(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [showHistory]);

  // Seed the pickers once models are available — A = selected model,
  // B = a different model (free/popular preferred) so the first run is useful.
  useEffect(() => {
    if (!pickerModelA) {
      setPickerModelA(
        allModels.some((m) => m.id === selectedModel)
          ? selectedModel
          : (allModels[0]?.id ?? selectedModel),
      );
    }
    if (!pickerModelB) {
      const a = pickerModelA ?? selectedModel;
      const different = allModels.filter((m) => m.id !== a);
      const preferred =
        different.find((m) => m.isFree || m.isPopular) ?? different[0];
      setPickerModelB(preferred?.id ?? a);
    }
  }, [
    allModels,
    pickerModelA,
    pickerModelB,
    selectedModel,
    setPickerModelA,
    setPickerModelB,
  ]);

  const modelA = pickerModelA ?? selectedModel;
  const modelB = pickerModelB ?? modelA;

  // Keep the latest streamed content in view — only when the reader is
  // already near the bottom, so they can scroll up freely while generating.
  const scrollArenaToBottom = useCallback(() => {
    const arena = arenaRef.current;
    if (!arena) return;
    const nearBottom =
      arena.scrollHeight - arena.scrollTop - arena.clientHeight < 160;
    if (nearBottom) arena.scrollTop = arena.scrollHeight;
  }, []);

  // Compare needs the full chat width — close the split preview on entry.
  // On exit, archive the current run into history and abort any streams.
  useEffect(() => {
    const ui = useUIStore.getState();
    if (ui.splitViewEnabled) ui.toggleSplitView();

    return () => {
      useCompareStore.getState().archiveCurrentSession();
      const compare = useCompareStore.getState();
      compare.controllers.a?.abort();
      compare.controllers.b?.abort();
    };
  }, []);

  const handleNewChat = () => {
    setShowHistory(false);
    useCompareStore.getState().newChat();
  };

  return (
    <div
      ref={arenaRef}
      // pb keeps the last card clear of the floating chat input
      className="flex-1 min-h-0 flex flex-col overflow-y-auto chat-scroll pb-32"
    >
      {/* ── Toolbar: title + model pickers + actions ───────────────────── */}
      <div className="flex-shrink-0 px-3 pt-2 pb-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <GitCompare className="size-4 text-ink-secondary dark:text-neutral-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-ink dark:text-neutral-100 truncate">
              Compare Models
            </span>
            {session?.isRunning && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                generating…
              </span>
            )}
          </div>

          {/* Actions: new chat · history · layout · exit */}
          <div ref={toolbarRef} className="flex items-center gap-0.5 flex-shrink-0 relative">
            <Tooltip content="New comparison">
              <button
                type="button"
                onClick={handleNewChat}
                className="size-7 flex items-center justify-center rounded-lg text-ink-secondary dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-tertiary transition-colors cursor-pointer"
                aria-label="New comparison"
              >
                <Plus className="size-3.5" />
              </button>
            </Tooltip>
            <Tooltip content="History">
              <button
                type="button"
                onClick={() => setShowHistory((v) => !v)}
                aria-expanded={showHistory}
                className={cn(
                  "size-7 flex items-center justify-center rounded-lg transition-colors cursor-pointer relative",
                  showHistory
                    ? "bg-neutral-100 dark:bg-dark-tertiary text-ink dark:text-neutral-100"
                    : "text-ink-secondary dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-tertiary",
                )}
                aria-label="Compare history"
              >
                <History className="size-3.5" />
                {history.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-3.5 h-3.5 px-0.5 rounded-full bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-[8px] font-bold flex items-center justify-center">
                    {history.length}
                  </span>
                )}
              </button>
            </Tooltip>
            {/* Arena layout — left–right / up–down */}
            <div
              className="flex items-center rounded-lg bg-neutral-100 dark:bg-dark-tertiary p-0.5"
              role="group"
              aria-label="Arena layout"
            >
              {LAYOUT_OPTIONS.map(({ value, label, icon: Icon }) => (
                <Tooltip key={value} content={label}>
                  <button
                    type="button"
                    onClick={() => setCompareLayout(value)}
                    aria-label={label}
                    aria-pressed={compareLayout === value}
                    className={cn(
                      "size-7 flex items-center justify-center rounded-md transition-colors cursor-pointer",
                      compareLayout === value
                        ? "bg-white dark:bg-dark-secondary text-ink dark:text-neutral-100 shadow-sm"
                        : "text-ink-muted dark:text-neutral-500 hover:text-ink dark:hover:text-neutral-200",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                </Tooltip>
              ))}
            </div>
            <Tooltip content="Exit compare">
              <button
                type="button"
                onClick={() => setCompareMode(false)}
                className="size-7 flex items-center justify-center rounded-lg text-ink-secondary dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-tertiary transition-colors cursor-pointer"
                aria-label="Exit compare mode"
              >
                <X className="size-3.5" />
              </button>
            </Tooltip>

            {/* ── History popover ─────────────────────────────────────── */}
            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 z-50 w-72 sm:w-80 max-w-[80vw] rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-secondary shadow-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-100 dark:border-dark-border">
                    <span className="text-xs font-semibold text-ink dark:text-neutral-100">
                      History
                    </span>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={() => useCompareStore.getState().clearHistory()}
                        className="text-[10px] text-ink-muted dark:text-neutral-500 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        Clear all
                      </button>
                    )}
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto chat-scroll p-1">
                    {history.length === 0 ? (
                      <div className="px-3 py-6 text-center">
                        <History className="size-5 mx-auto mb-1.5 text-ink-muted dark:text-neutral-600" />
                        <p className="text-xs text-ink-muted dark:text-neutral-600">
                          No past comparisons yet
                        </p>
                      </div>
                    ) : (
                      history.map((entry) => (
                        <div
                          key={entry.id}
                          className="group flex items-start gap-1 rounded-lg hover:bg-neutral-50 dark:hover:bg-dark-secondary"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              useCompareStore.getState().loadFromHistory(entry.id);
                              setShowHistory(false);
                            }}
                            className="flex-1 min-w-0 px-2 py-1.5 text-left"
                          >
                            <p className="text-xs font-medium text-ink dark:text-neutral-100 truncate">
                              {entry.prompt}
                            </p>
                            <p className="text-[10px] text-ink-muted dark:text-neutral-600 truncate mt-0.5">
                              {modelShortName(entry.modelA)} vs{" "}
                              {modelShortName(entry.modelB)}
                            </p>
                            <p className="text-[10px] text-ink-muted dark:text-neutral-600 mt-0.5">
                              {formatRelativeTime(entry.finishedAt)} ·{" "}
                              {formatElapsed(entry.finishedAt - entry.startedAt)}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              useCompareStore.getState().deleteFromHistory(entry.id)
                            }
                            className="mt-1 mr-1 flex-shrink-0 size-6 flex items-center justify-center rounded-md text-ink-muted dark:text-neutral-600 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                            aria-label="Delete comparison"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Model pickers — always one row, truncating on small screens */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5">
          <ModelPicker
            value={modelA}
            models={allModels}
            isLoading={isLoading}
            sideLabel="Model A"
            align="left"
            onSelect={setPickerModelA}
          />
          <button
            type="button"
            onClick={swapModels}
            className="flex-shrink-0 size-6 flex items-center justify-center rounded-full border border-neutral-200 dark:border-dark-border text-ink-muted dark:text-neutral-600 hover:text-ink dark:hover:text-neutral-200 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors cursor-pointer"
            aria-label="Swap models"
          >
            <ArrowLeftRight className="size-3" />
          </button>
          <ModelPicker
            value={modelB}
            models={allModels}
            isLoading={isLoading}
            sideLabel="Model B"
            align="right"
            onSelect={setPickerModelB}
          />
        </div>
      </div>

      {/* ── Your prompt — visible, right-aligned like a user bubble ───── */}
      {session && (
        <div className="flex-shrink-0 px-3 pb-2.5 flex flex-col items-end">
          <span className="text-[11px] font-semibold text-ink-tertiary dark:text-neutral-500 mb-1">
            You
          </span>
          <div className="max-w-[85%] md:max-w-[70%] rounded-2xl rounded-tr-sm bg-neutral-100 dark:bg-dark-tertiary px-4 py-2.5 text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap break-words selectable">
            {session.prompt}
          </div>
        </div>
      )}

      {/* ── Cards: layout follows the toolbar control.
             Left–right = swipe pager on mobile (full-width cards you swipe
             between), side-by-side columns on desktop. Up–down = stacked
             one below the other. Cards size to their content and the arena
             scrolls as one page. ───────────────────────────────────────── */}
      <div
        ref={pagerRef}
        onScroll={handlePagerScroll}
        className={cn(
          "items-start",
          compareLayout === "left-right"
            ? "flex gap-2.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-3 pb-3 md:grid md:grid-cols-2 md:gap-3 md:overflow-visible"
            : "grid grid-cols-1 gap-2.5 md:gap-3 px-3 pb-3",
        )}
      >
        <CompareCard
          className={cn(
            compareLayout === "left-right" &&
              "min-w-[82%] sm:min-w-[72%] md:min-w-0 snap-center shrink-0 md:shrink",
          )}
          side="a"
          model={session?.modelA ?? modelA}
          result={session?.results.a ?? { ...EMPTY_RESULT, model: modelA }}
          onUse={() => onUse("a")}
          onAutoScroll={scrollArenaToBottom}
        />
        <CompareCard
          className={cn(
            compareLayout === "left-right" &&
              "min-w-[82%] sm:min-w-[72%] md:min-w-0 snap-center shrink-0 md:shrink",
          )}
          side="b"
          model={session?.modelB ?? modelB}
          result={session?.results.b ?? { ...EMPTY_RESULT, model: modelB }}
          onUse={() => onUse("b")}
          onAutoScroll={scrollArenaToBottom}
        />
      </div>

      {/* Pager dots — swipe indicator, mobile only in left-right mode */}
      {compareLayout === "left-right" && (
        <div className="flex items-center justify-center gap-1.5 mt-2 md:hidden">
          {[0, 1].map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => jumpToCard(i)}
              aria-label={i === 0 ? "Show Model A result" : "Show Model B result"}
              aria-pressed={activeCard === i}
              className={cn(
                "h-1.5 rounded-full transition-all cursor-pointer",
                activeCard === i
                  ? "w-4 bg-neutral-900 dark:bg-neutral-100"
                  : "w-1.5 bg-neutral-300 dark:bg-neutral-700",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
