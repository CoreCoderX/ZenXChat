"use client";

import { useState } from "react";
import {
  useMemoryStore,
  MAX_MEMORIES,
  MAX_MEMORY_CHARS,
  MAX_TOTAL_MEMORY_CHARS,
} from "@/store/memoryStore";
import { useSettingsStore } from "@/store/settingsStore";
import { MemoryMode } from "@/types";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { Pencil, Trash2, Check, MemoryStick } from "lucide-react";
import { cn } from "@/lib/utils";

const MODES: { value: MemoryMode; label: string; description: string }[] = [
  {
    value: "off",
    label: "Off",
    description: "Memory is disabled — nothing is detected or saved.",
  },
  {
    value: "ask",
    label: "Ask before saving",
    description: "Personal details are detected, but you confirm each one.",
  },
  {
    value: "auto",
    label: "Automatically remember",
    description: "Detected facts are saved silently (with a small notice).",
  },
];

export default function MemorySettings() {
  const { memoryMode, setMemoryMode } = useSettingsStore();
  const memories = useMemoryStore((s) => s.memories);
  const updateMemory = useMemoryStore((s) => s.updateMemory);
  const deleteMemory = useMemoryStore((s) => s.deleteMemory);
  const toggleMemory = useMemoryStore((s) => s.toggleMemory);
  const clearAll = useMemoryStore((s) => s.clearAll);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  const totalChars = memories.reduce((s, m) => s + m.text.length, 0);
  const enabledCount = memories.filter((m) => m.enabled).length;

  return (
    <div className="space-y-6 max-w-xl">
      {/* ── Mode selector ─────────────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-medium text-ink dark:text-neutral-100 mb-3">
          How memory works
        </h3>
        <div className="space-y-2">
          {MODES.map((mode) => (
            <button
              key={mode.value}
              type="button"
              onClick={() => setMemoryMode(mode.value)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left transition-colors cursor-pointer",
                memoryMode === mode.value
                  ? "border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-dark-tertiary"
                  : "border-neutral-200 dark:border-dark-border hover:bg-neutral-50 dark:hover:bg-dark-tertiary",
              )}
            >
              <span
                className={cn(
                  "size-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center",
                  memoryMode === mode.value
                    ? "border-neutral-900 dark:border-neutral-100"
                    : "border-neutral-300 dark:border-neutral-600",
                )}
                aria-hidden
              >
                {memoryMode === mode.value && (
                  <span className="size-1.5 rounded-full bg-neutral-900 dark:bg-neutral-100" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-ink dark:text-neutral-100">
                  {mode.label}
                </span>
                <span className="block text-xs text-ink-tertiary dark:text-neutral-500 mt-0.5">
                  {mode.description}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Usage meter — memory is deliberately limited ──────────────── */}
      <section>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <h3 className="text-sm font-medium text-ink dark:text-neutral-100">
            Saved memories
          </h3>
          <span className="text-xs tabular-nums text-ink-muted dark:text-neutral-600 flex-shrink-0">
            {memories.length}/{MAX_MEMORIES} ·{" "}
            {totalChars.toLocaleString()}/{MAX_TOTAL_MEMORY_CHARS.toLocaleString()}{" "}
            chars
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-neutral-100 dark:bg-dark-tertiary overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-300",
              totalChars / MAX_TOTAL_MEMORY_CHARS > 0.9
                ? "bg-red-500"
                : "bg-neutral-800 dark:bg-neutral-200",
            )}
            style={{
              width: `${Math.min(100, (totalChars / MAX_TOTAL_MEMORY_CHARS) * 100)}%`,
            }}
          />
        </div>
        <p className="text-[11px] text-ink-muted dark:text-neutral-600 mt-1.5">
          Memory is capped at {MAX_MEMORIES} facts or{" "}
          {MAX_TOTAL_MEMORY_CHARS.toLocaleString()} characters — when the limit
          is reached the oldest memory is removed automatically.{" "}
          {enabledCount} currently active.
        </p>
      </section>

      {/* ── Memory list: edit / delete / disable ─────────────────────── */}
      <section className="space-y-2">
        {memories.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-200 dark:border-dark-border py-8 text-center">
            <MemoryStick className="size-6 mx-auto mb-2 text-ink-muted dark:text-neutral-600" />
            <p className="text-sm text-ink-secondary dark:text-neutral-400">
              No memories yet
            </p>
            <p className="text-xs text-ink-muted dark:text-neutral-600 mt-1 px-6">
              Share something about yourself in chat — like{" "}
              <span className="italic">
                “remember that I prefer TypeScript”
              </span>{" "}
              — and it will show up here.
            </p>
          </div>
        ) : (
          memories.map((memory) => (
            <div
              key={memory.id}
              className="rounded-xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-secondary px-3 py-2.5 flex items-start gap-2.5"
            >
              <div className="pt-0.5 flex-shrink-0">
                <Toggle
                  size="sm"
                  checked={memory.enabled}
                  onChange={(v) => toggleMemory(memory.id, v)}
                />
              </div>

              <div className="flex-1 min-w-0">
                {editingId === memory.id ? (
                  <div className="space-y-1.5">
                    <textarea
                      value={editText}
                      maxLength={MAX_MEMORY_CHARS}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={2}
                      autoFocus
                      className={cn(
                        "w-full text-xs rounded-lg border px-2 py-1.5 resize-none",
                        "border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-tertiary",
                        "text-ink dark:text-neutral-100 outline-none focus:border-neutral-300 dark:focus:border-neutral-700",
                      )}
                    />
                    <div className="flex gap-1.5">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() => {
                          if (editText.trim()) {
                            updateMemory(memory.id, editText);
                          }
                          setEditingId(null);
                        }}
                      >
                        <Check className="size-3" />
                        Save
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className={cn(
                        "text-sm text-ink dark:text-neutral-100 selectable",
                        !memory.enabled && "opacity-50 line-through",
                      )}
                    >
                      {memory.text}
                    </p>
                    <p className="text-[10px] text-ink-muted dark:text-neutral-600 mt-0.5">
                      {new Date(memory.updatedAt).toLocaleDateString()}
                      {!memory.enabled && " · disabled"}
                    </p>
                  </>
                )}
              </div>

              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(memory.id);
                    setEditText(memory.text);
                  }}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-tertiary text-ink-secondary dark:text-neutral-400 transition-colors cursor-pointer"
                  aria-label="Edit memory"
                >
                  <Pencil className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMemory(memory.id)}
                  className="size-7 flex items-center justify-center rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-ink-secondary dark:text-neutral-400 hover:text-red-500 transition-colors cursor-pointer"
                  aria-label="Delete memory"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        {memories.length > 0 && (
          <div className="pt-1">
            {confirmClear ? (
              <div className="flex items-center gap-2 text-xs text-ink-secondary dark:text-neutral-400">
                <span>Clear all {memories.length} memories?</span>
                <Button
                  variant="danger"
                  size="xs"
                  onClick={() => {
                    clearAll();
                    setConfirmClear(false);
                  }}
                >
                  Yes, clear all
                </Button>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmClear(false)}
                >
                  Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setConfirmClear(true)}
                className="text-red-500 hover:text-red-600 dark:text-red-400"
              >
                <Trash2 className="size-3" />
                Clear all
              </Button>
            )}
          </div>
        )}
      </section>

      {/* ── How detection works ──────────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50/60 dark:bg-dark-tertiary/40 px-3 py-2.5">
        <p className="text-[11px] leading-relaxed text-ink-secondary dark:text-neutral-400">
          <span className="font-semibold text-ink dark:text-neutral-200">
            How detection works:{" "}
          </span>
          memories are only suggested when you share personal details
          (“I prefer…”, “my name is…”, “I work at…”) or use explicit keywords
          (“remember that…”, “save this…”). Nothing is ever saved without your
          say-so, unless you choose “Automatically remember”.
        </p>
      </section>
    </div>
  );
}
