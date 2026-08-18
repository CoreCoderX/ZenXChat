"use client";

import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, X } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { polishSystemPrompt } from "@/lib/polish";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

const MAX_PROMPT_CHARS = 10000;

export default function GeneralSettings() {
  const {
    theme,
    setTheme,
    systemPrompt,
    setSystemPrompt,
    streamingEnabled,
    toggleStreaming,
    sendOnEnter,
    toggleSendOnEnter,
    showTimestamps,
    toggleTimestamps,
    getActiveApiKey,
  } = useSettingsStore();

  // ── AI prompt polishing ──────────────────────────────────────────────────
  const [polishing, setPolishing] = useState(false);
  const [polishResult, setPolishResult] = useState<string | null>(null);
  const [polishError, setPolishError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight polish when the settings panel unmounts
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const handlePolish = async () => {
    if (!systemPrompt.trim() || polishing) return;
    setPolishing(true);
    setPolishError(null);
    setPolishResult(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const apiKey = getActiveApiKey();
      if (!apiKey) {
        setPolishError("Add an API key in Settings → API Keys first.");
        return;
      }
      const result = await polishSystemPrompt(
        systemPrompt,
        apiKey,
        controller.signal,
      );
      setPolishResult(result);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setPolishError((err as Error).message ?? "Polishing failed.");
      }
    } finally {
      setPolishing(false);
      abortRef.current = null;
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Appearance ─────────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-medium text-ink dark:text-neutral-100 mb-3">
          Appearance
        </h3>
        <div className="flex gap-2">
          {(["light", "dark", "system"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTheme(t)}
              className={cn(
                "flex-1 py-2 rounded-xl text-xs font-medium capitalize border transition-colors",
                theme === t
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 border-transparent"
                  : "border-neutral-200 dark:border-dark-border text-ink-secondary dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-dark-tertiary",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* ── Global System Prompt ────────────────────────────── */}
      <section>
        <h3 className="text-sm font-medium text-ink dark:text-neutral-100 mb-1">
          Global System Prompt
        </h3>
        <p className="text-xs text-ink-tertiary dark:text-neutral-500 mb-2">
          Applied to all new conversations (can be overridden per chat)
        </p>
        <textarea
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
          placeholder="You are a helpful assistant..."
          rows={4}
          className={cn(
            "w-full px-3 py-2.5 text-sm rounded-xl resize-none",
            "border border-neutral-200 dark:border-dark-border",
            "bg-neutral-50 dark:bg-dark-tertiary",
            "text-ink dark:text-neutral-100",
            "placeholder:text-ink-muted dark:placeholder:text-neutral-600",
            "outline-none focus:border-neutral-300 dark:focus:border-neutral-700",
            "transition-colors",
          )}
        />

        {/* Character counter + tip */}
        <div className="mt-1.5 flex items-center justify-between gap-2">
          <p className="text-[11px] text-ink-muted dark:text-neutral-600">
            Tip: keep it under 250 words for best results.
          </p>
          <span
            className={cn(
              "text-[11px] font-medium tabular-nums select-none",
              systemPrompt.length > MAX_PROMPT_CHARS
                ? "text-red-500"
                : "text-ink-muted dark:text-neutral-600",
            )}
          >
            {systemPrompt.length}/{MAX_PROMPT_CHARS}
          </span>
        </div>

        {/* AI polish — improve the prompt with a free model */}
        <div className="mt-2 flex items-center justify-end">
          <Button
            variant="outline"
            size="xs"
            onClick={handlePolish}
            disabled={polishing || !systemPrompt.trim()}
            isLoading={polishing}
            className="flex-shrink-0"
          >
            {!polishing && <Sparkles className="size-3" />}
            Polish with AI
          </Button>
        </div>

        {polishResult && (
          <div className="mt-2 rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles className="size-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                Polished version
              </span>
            </div>
            <p className="text-xs text-ink dark:text-neutral-200 whitespace-pre-wrap selectable mb-2">
              {polishResult}
            </p>
            <div className="flex gap-1.5">
              <Button
                variant="primary"
                size="xs"
                onClick={() => {
                  setSystemPrompt(polishResult);
                  setPolishResult(null);
                }}
              >
                <Check className="size-3" />
                Apply
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => setPolishResult(null)}
              >
                <X className="size-3" />
                Discard
              </Button>
            </div>
          </div>
        )}

        {polishError && (
          <p className="mt-2 text-[11px] text-red-500">{polishError}</p>
        )}
      </section>

      {/* ── Chat Behavior ───────────────────────────────────── */}
      <section>
        <h3 className="text-sm font-medium text-ink dark:text-neutral-100 mb-3">
          Chat Behavior
        </h3>
        <div className="space-y-3">
          <Toggle
            checked={streamingEnabled}
            onChange={toggleStreaming}
            label="Streaming responses"
            description="Show AI responses token by token as they arrive"
          />
          <Toggle
            checked={sendOnEnter}
            onChange={toggleSendOnEnter}
            label="Send on Enter"
            description="Press Enter to send · Shift+Enter for new line"
          />
          <Toggle
            checked={showTimestamps}
            onChange={toggleTimestamps}
            label="Show timestamps"
            description="Display time and model name under each message"
          />
        </div>
      </section>
    </div>
  );
}
