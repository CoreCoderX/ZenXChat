"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Check, Copy, Play } from "lucide-react";
import { cn, isPreviewable } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";

interface CodeBlockProps {
  code: string;
  language: string;
  isStreaming?: boolean;
}

export default function CodeBlock({ code, language, isStreaming = false }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);
  const canPreview = isPreviewable(language);

  const { setPreviewContent } = useUIStore();
  const { theme } = useSettingsStore();

  // ── Shiki syntax highlight ────────────────────────────────────────────────
  useEffect(() => {
    if (!codeRef.current) return;

    // If still streaming, skip heavy syntax highlighting to keep UI responsive
    // and prevent touch events/scrolling from freezing on mobile devices.
    if (isStreaming) {
      codeRef.current.textContent = code;
      return;
    }

    import("shiki").then(async ({ codeToHtml }) => {
      try {
        const isSystemDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = theme === "dark" || (theme === "system" && isSystemDark);
        const shikiTheme = isDark ? "github-dark" : "github-light";

        const html = await codeToHtml(code, {
          lang: language || "plaintext",
          theme: shikiTheme,
        });

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");
        const parsedCodeEl = doc.querySelector("code");
        if (codeRef.current && parsedCodeEl) {
          codeRef.current.innerHTML = parsedCodeEl.innerHTML;
        }
      } catch (err) {
        console.error("Shiki highlighting failed, falling back:", err);
        if (codeRef.current) codeRef.current.textContent = code;
      }
    });
  }, [code, language, theme, isStreaming]);

  // ── Copy ──────────────────────────────────────────────────────────────────
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = code;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // ── Preview ───────────────────────────────────────────────────────────────
  const handlePreview = useCallback(() => {
    setPreviewContent(code, language);
  }, [code, language, setPreviewContent]);

  return (
    /*
      IMPORTANT: No overflow-hidden on the outer wrapper — it breaks sticky positioning.
      Instead we clip each section independently.
    */
    <div className="my-4 rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-tertiary">

      {/* Sticky header — sticks flush with the bottom of the unified static ChatHeader */}
      <div className="sticky top-0 z-10 flex items-center justify-between pl-4 pr-2 py-1.5 rounded-t-xl bg-neutral-100 dark:bg-neutral-900/80 border-b border-neutral-200 dark:border-dark-border backdrop-blur-sm">
        {/* Language label */}
        <span className="text-[10px] font-mono font-semibold text-ink-tertiary dark:text-neutral-500 uppercase tracking-widest select-none">
          {language || "text"}
        </span>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-0.5">
          {canPreview && (
            <button
              onClick={handlePreview}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium text-ink-secondary dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 hover:text-ink dark:hover:text-neutral-100 transition-colors"
            >
              <Play className="size-3 flex-shrink-0" />
              Preview
            </button>
          )}
          <button
            onClick={handleCopy}
            aria-label="Copy code"
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors",
              copied
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-ink-secondary dark:text-neutral-400 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 hover:text-ink dark:hover:text-neutral-100"
            )}
          >
            {copied ? (
              <>
                <Check className="size-3 flex-shrink-0" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="size-3 flex-shrink-0" />
                Copy
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code area — overflow only here, so it doesn't affect sticky */}
      <div className={cn("overflow-x-auto rounded-b-xl", isStreaming && "pointer-events-none")}>
        <pre className="p-4 text-xs leading-relaxed m-0">
          <code
            ref={codeRef}
            className={cn(
              "font-mono hljs block",
              language && `language-${language}`,
            )}
          >
            {code}
          </code>
        </pre>
      </div>
    </div>
  );
}
