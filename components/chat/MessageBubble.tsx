"use client";

import { useState, KeyboardEvent } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  User,
  Pencil,
  Brain,
  Check,
  X,
  Send,
} from "lucide-react";
import TextareaAutosize from "react-textarea-autosize";
import { Message } from "@/types";
import { useMemoryStore } from "@/store/memoryStore";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import MessageActions from "./MessageActions";
import AILoader from "@/components/smoothui/AILoader";
import AIReasoning from "@/components/smoothui/AIReasoning";
import { cn, formatTimestamp } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { getProviderDisplayName } from "@/lib/models";
import Button from "@/components/ui/Button";

interface MessageBubbleProps {
  message: Message;
  isLast: boolean;
  onRegenerate?: () => void;
  isGenerating?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
}

function getModelDisplayName(modelId?: string): string {
  if (!modelId) return "Assistant";
  const parts = modelId.split("/");
  const provider = parts[0] ?? "";
  const name = (parts[1] ?? modelId)
    .replace(/:free$/, "")
    .replace(/:beta$/, "")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${getProviderDisplayName(provider)} · ${name}`;
}

function getModelInitials(modelId?: string): string {
  if (!modelId) return "AI";
  return (modelId.split("/")[0] ?? "AI").slice(0, 2).toUpperCase();
}

export default function MessageBubble({
  message,
  isLast,
  onRegenerate,
  isGenerating,
  onEdit,
}: MessageBubbleProps) {
  const { showTimestamps } = useSettingsStore();
  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant";

  const pendingCandidates = useMemoryStore((s) => s.pendingCandidates);
  const lastSavedNote = useMemoryStore((s) => s.lastSavedNote);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const removePendingCandidate = useMemoryStore((s) => s.removePendingCandidate);
  const setPendingCandidates = useMemoryStore((s) => s.setPendingCandidates);

  const [isEditing, setIsEditing] = useState(false);
  const [showErrorDetail, setShowErrorDetail] = useState(false);

  // ── User message ──────────────────────────────────────────────────────────
  if (isUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="group/msg w-full px-4 py-2 flex flex-col items-end"
      >
        {/* Label row */}
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-[11px] font-semibold text-ink-tertiary dark:text-neutral-500">
            You
          </span>
          <div className="size-5 rounded-full bg-neutral-900 dark:bg-neutral-100 flex items-center justify-center flex-shrink-0">
            <User className="size-3 text-white dark:text-neutral-900" />
          </div>
        </div>

        {/* Bubble / Edit box */}
        <div className="relative flex flex-col items-end max-w-[85%]">
          {isEditing ? (
            <EditMessageBox
              initialText={message.content}
              onCancel={() => setIsEditing(false)}
              onSend={(newText) => {
                if (onEdit) onEdit(message.id, newText);
                setIsEditing(false);
              }}
            />
          ) : (
            <div className="bg-neutral-100 dark:bg-dark-tertiary px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap break-words selectable w-full">
              {message.content}
              {message.attachments && message.attachments.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {message.attachments.map((file) =>
                    file.preview ? (
                      <img
                        key={file.id}
                        src={file.preview}
                        alt={file.name}
                        className="max-w-[200px] max-h-[150px] rounded-xl object-cover"
                      />
                    ) : (
                      <span
                        key={file.id}
                        className="text-[11px] bg-neutral-200 dark:bg-dark-quaternary px-2 py-1 rounded-lg"
                      >
                        📄 {file.name}
                      </span>
                    ),
                  )}
                </div>
              )}
            </div>
          )}

          {/* Edit action button (visible on hover below the bubble) */}
          {!isEditing && onEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="mt-1 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-dark-quaternary text-[10px] text-ink-tertiary dark:text-neutral-500 cursor-pointer"
              title="Edit message"
            >
              <Pencil className="size-2.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Memory — explicit confirmation card ("Remember this?") */}
        {pendingCandidates?.messageId === message.id &&
          pendingCandidates.candidates.length > 0 && (
            <div className="mt-2 w-full max-w-[85%] rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/20 p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Brain className="size-3.5 text-indigo-500 dark:text-indigo-400 flex-shrink-0" />
                <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                  Remember this?
                </span>
              </div>
              <div className="space-y-2">
                {pendingCandidates.candidates.map((candidate, i) => (
                  <div
                    key={`${i}-${candidate}`}
                    className="flex items-start gap-2"
                  >
                    <p className="flex-1 min-w-0 text-xs text-ink dark:text-neutral-200 leading-relaxed selectable">
                      “{candidate}”
                    </p>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          addMemory(candidate);
                          removePendingCandidate(i);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-indigo-600 text-white hover:bg-indigo-500 transition-colors cursor-pointer"
                      >
                        Remember
                      </button>
                      <button
                        type="button"
                        onClick={() => removePendingCandidate(i)}
                        title="Don't save this"
                        className="px-2 py-1 rounded-lg text-[10px] font-medium text-ink-tertiary dark:text-neutral-500 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
                      >
                        Don&apos;t save
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPendingCandidates(null)}
                className="mt-2 text-[10px] text-ink-muted dark:text-neutral-500 underline underline-offset-2 hover:text-ink dark:hover:text-neutral-300 transition-colors cursor-pointer"
              >
                Don&apos;t remember anything from this message
              </button>
            </div>
          )}

        {/* Memory — auto-saved notice (auto mode) */}
        {lastSavedNote?.messageId === message.id && lastSavedNote.count > 0 && (
          <span className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400">
            <Check className="size-2.5" />
            Saved {lastSavedNote.count} fact
            {lastSavedNote.count > 1 ? "s" : ""} to memory · manage in
            Settings → Memory
          </span>
        )}

        {showTimestamps && (
          <span className="text-[10px] text-ink-muted dark:text-neutral-600 mt-1 select-none">
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </motion.div>
    );
  }

  // ── Assistant message ─────────────────────────────────────────────────────
  if (isAssistant) {
    const showReasoning = !!message.reasoning?.trim();
    // Waiting for the first token — neither the trace nor the answer has landed
    // yet, so the loader is the honest "still working" signal.
    const waitingForFirstTokens =
      message.isStreaming && !message.content && !showReasoning;

    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.15 }}
        className="group w-full px-4 py-2"
      >
        {/* Model name row — NO left indent */}
        <div className="flex items-center gap-2 mb-1.5">
          <div
            className={cn(
              "size-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0",
              message.isError
                ? "bg-red-100 dark:bg-red-950/40"
                : "bg-neutral-200 dark:bg-dark-quaternary",
            )}
          >
            {message.isError ? (
              <AlertTriangle className="size-3 text-red-500" />
            ) : (
              <span className="text-ink-secondary dark:text-neutral-500 text-[9px]">
                {getModelInitials(message.model)}
              </span>
            )}
          </div>

          <span className="text-xs font-semibold text-ink dark:text-neutral-200 truncate">
            {message.isError ? "Error" : getModelDisplayName(message.model)}
          </span>

          {showTimestamps && (
            <span className="text-[10px] text-ink-muted dark:text-neutral-600 flex-shrink-0 select-none">
              {formatTimestamp(message.timestamp)}
            </span>
          )}

          {message.isStreaming && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 flex-shrink-0">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              generating
            </span>
          )}
        </div>

        {/* Reasoning trace — live while streaming, collapses with a beat when done */}
        {showReasoning && (
          <AIReasoning
            isStreaming={message.isStreaming && !message.content}
            duration={message.reasoningDuration}
            className="mb-1.5"
          >
            {message.reasoning}
          </AIReasoning>
        )}

        {/* AI loader while waiting for the model's first token */}
        {waitingForFirstTokens && (
          <AILoader
            variant="dots"
            showElapsed
            label="Thinking"
            className="py-1 mb-1.5"
          />
        )}

        {/* Content — NO left padding/indent, full width */}
        <div className="w-full">
          {message.isError ? (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="size-3.5 flex-shrink-0" />
                <span>Something went wrong</span>

                {/* Small "!" to reveal the full raw error info */}
                {message.errorDetail && (
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
                      "text-[11px] font-bold leading-none",
                      "bg-red-200/70 dark:bg-red-900/50 text-red-700 dark:text-red-300",
                      "hover:bg-red-300/70 dark:hover:bg-red-800/50 transition-colors cursor-pointer",
                      showErrorDetail && "bg-red-300/70 dark:bg-red-800/50",
                    )}
                  >
                    !
                  </button>
                )}
              </p>

              <MarkdownRenderer
                content={message.content}
                className="text-red-700 dark:text-red-300 selectable"
              />

              {/* Full raw error info (status, model, raw message) */}
              {showErrorDetail && message.errorDetail && (
                <div className="mt-2 rounded-lg bg-red-100/60 dark:bg-red-950/30 border border-red-200/70 dark:border-red-900/40 px-3 py-2">
                  <pre className="text-[11px] leading-relaxed text-red-800 dark:text-red-300 whitespace-pre-wrap break-words font-mono selectable">
                    {message.errorDetail}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <MarkdownRenderer
              content={message.content}
              isStreaming={message.isStreaming}
              className="selectable"
            />
          )}

          {!message.isStreaming && !message.isError && (
            <MessageActions
              message={message}
              onRegenerate={onRegenerate}
              isLast={isLast}
              isGenerating={isGenerating}
            />
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}

// ── Edit box — a polished card matching the composer's look ─────────────────

function EditMessageBox({
  initialText,
  onCancel,
  onSend,
}: {
  initialText: string;
  onCancel: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState(initialText);
  const { sendOnEnter } = useSettingsStore();

  const canSend = text.trim().length > 0;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
      return;
    }

    // Mirror the composer: Enter sends on desktop, Shift+Enter / mobile
    // insert a newline instead.
    const isMobileDevice =
      typeof window !== "undefined" &&
      (/Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ||
        window.matchMedia("(max-width: 1023px)").matches);
    if (e.key === "Enter" && sendOnEnter && !e.shiftKey && !isMobileDevice) {
      e.preventDefault();
      if (canSend) onSend(text.trim());
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15, ease: "easeOut" }}
      className={cn(
        "w-full rounded-2xl overflow-hidden",
        "bg-white dark:bg-dark-secondary",
        "border border-neutral-200/80 dark:border-dark-border/80",
        "shadow-lg focus-within:border-neutral-300 dark:focus-within:border-neutral-700 focus-within:shadow-xl",
        "transition-all duration-150",
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-secondary dark:text-neutral-400">
          <Pencil className="size-3" />
          Edit message
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="size-6 flex items-center justify-center rounded-lg text-ink-muted dark:text-neutral-500 hover:bg-neutral-100 dark:hover:bg-dark-tertiary hover:text-ink dark:hover:text-neutral-100 transition-colors cursor-pointer"
          aria-label="Cancel editing"
        >
          <X className="size-3.5" />
        </button>
      </div>

      {/* Auto-growing textarea */}
      <TextareaAutosize
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        minRows={2}
        maxRows={8}
        autoFocus
        placeholder="Edit your message…"
        className={cn(
          "w-full bg-transparent px-3.5 py-2 text-sm resize-none",
          "text-ink dark:text-neutral-100 leading-relaxed",
          "placeholder:text-ink-muted dark:placeholder:text-neutral-600",
          "outline-none selectable",
        )}
      />

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-2.5 pb-2.5">
        <span className="hidden sm:block text-[10px] text-ink-muted dark:text-neutral-600 select-none">
          {sendOnEnter ? "Enter to send · Esc to cancel" : "Esc to cancel"}
        </span>
        <div className="flex items-center gap-1.5 ml-auto">
          <Button variant="ghost" size="xs" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="xs"
            onClick={() => canSend && onSend(text.trim())}
            disabled={!canSend}
          >
            <Send className="size-3" />
            Send
          </Button>
        </div>
      </div>
    </motion.div>
  );
}
