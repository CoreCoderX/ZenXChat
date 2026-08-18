"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search, Check, ChevronDown, Loader2 } from "lucide-react";
import { OpenRouterModel } from "@/types";
import {
  formatContextLength,
  formatModelPrice,
  getProviderDisplayName,
} from "@/lib/models";
import Badge from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface ModelPickerProps {
  value: string;
  models: OpenRouterModel[];
  isLoading?: boolean;
  sideLabel: string;
  align?: "left" | "right";
  onSelect: (id: string) => void;
}

function displayName(modelId: string): string {
  const parts = modelId.split("/");
  const name = (parts[1] ?? modelId)
    .replace(/:free$/, "")
    .replace(/:beta$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${getProviderDisplayName(parts[0] ?? "")} · ${name}`;
}

export default function ModelPicker({
  value,
  models,
  isLoading,
  sideLabel,
  align = "left",
  onSelect,
}: ModelPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  const selected = models.find((m) => m.id === value);

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q),
    );
  }, [models, query]);

  return (
    <div ref={ref} className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setQuery("");
        }}
        aria-expanded={open}
        className="flex w-full items-center gap-1.5 min-w-0 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-dark-tertiary cursor-pointer"
      >
        <span className="sr-only">{sideLabel}</span>
        <span className="flex-shrink-0 size-5 rounded-md bg-neutral-200 dark:bg-dark-quaternary flex items-center justify-center text-[8px] font-bold text-ink-secondary dark:text-neutral-400 uppercase">
          {value.split("/")[0]?.slice(0, 2) ?? "AI"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-medium uppercase tracking-wide text-ink-muted dark:text-neutral-600">
            {sideLabel}
          </span>
          <span className="block text-xs font-semibold text-ink dark:text-neutral-100 truncate">
            {selected ? selected.name : displayName(value)}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "size-3 flex-shrink-0 text-ink-muted dark:text-neutral-600 transition-transform duration-150",
            open && "rotate-180",
          )}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              "absolute z-50 mt-1 w-72 sm:w-80 max-w-[80vw]",
              "rounded-xl border border-neutral-200 dark:border-dark-border",
              "bg-white dark:bg-dark-secondary shadow-xl overflow-hidden",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {/* Search */}
            <div className="p-2 border-b border-neutral-100 dark:border-dark-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-ink-muted dark:text-neutral-600" />
                <input
                  autoFocus
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search models…"
                  className="w-full pl-8 pr-2 py-1.5 text-xs rounded-lg bg-neutral-50 dark:bg-dark-tertiary border border-neutral-200 dark:border-dark-border text-ink dark:text-neutral-100 placeholder:text-ink-muted dark:placeholder:text-neutral-600 outline-none focus:border-neutral-300 dark:focus:border-neutral-700"
                />
              </div>
            </div>

            {/* List */}
            <div className="max-h-[40vh] overflow-y-auto chat-scroll p-1">
              {isLoading && filtered.length === 0 ? (
                <div className="flex items-center gap-2 px-3 py-3 text-xs text-ink-muted dark:text-neutral-600">
                  <Loader2 className="size-3.5 animate-spin" />
                  Loading models…
                </div>
              ) : filtered.length === 0 ? (
                <div className="px-3 py-3 text-xs text-ink-muted dark:text-neutral-600">
                  No models found
                </div>
              ) : (
                filtered.map((model) => {
                  const isSelected = model.id === value;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      onClick={() => {
                        onSelect(model.id);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors",
                        isSelected
                          ? "bg-neutral-100 dark:bg-dark-tertiary"
                          : "hover:bg-neutral-50 dark:hover:bg-dark-secondary",
                      )}
                    >
                      <span className="flex-shrink-0 size-6 rounded-md bg-neutral-100 dark:bg-dark-quaternary flex items-center justify-center text-[8px] font-bold text-ink-secondary dark:text-neutral-500 uppercase">
                        {model.provider.slice(0, 2)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-medium text-ink dark:text-neutral-100 truncate">
                            {model.name}
                          </span>
                          {model.isFree && <Badge variant="free">Free</Badge>}
                        </span>
                        <span className="block text-[10px] text-ink-muted dark:text-neutral-600 truncate">
                          {getProviderDisplayName(model.provider)} ·{" "}
                          {formatContextLength(model.context_length)} ·{" "}
                          {formatModelPrice(model.pricing)}
                        </span>
                      </span>
                      {isSelected && (
                        <Check className="size-3.5 text-ink dark:text-neutral-100 flex-shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
