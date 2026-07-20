"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, User, Pencil } from "lucide-react";
import { Message } from "@/types";
import MarkdownRenderer from "@/components/markdown/MarkdownRenderer";
import MessageActions from "./MessageActions";
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
  
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

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

        {/* Bubble */}
        <div className="relative flex flex-col items-end max-w-[85%]">
          <div className="bg-neutral-100 dark:bg-dark-tertiary px-4 py-2.5 rounded-2xl rounded-tr-sm text-sm text-ink dark:text-neutral-100 whitespace-pre-wrap break-words selectable w-full">
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px] md:min-w-[300px] py-0.5">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-xs bg-white dark:bg-dark-secondary text-ink dark:text-neutral-100 border border-neutral-300 dark:border-dark-border rounded-xl p-2 focus:outline-none focus:border-neutral-400 dark:focus:border-neutral-700 resize-y min-h-[60px]"
                  autoFocus
                />
                <div className="flex items-center justify-end gap-1.5">
                  <Button
                    variant="ghost"
                    size="xs"
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      if (editText.trim() && onEdit) {
                        onEdit(message.id, editText.trim());
                      }
                      setIsEditing(false);
                    }}
                  >
                    Send
                  </Button>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </div>

          {/* Edit action button (visible on hover below the bubble) */}
          {!isEditing && onEdit && (
            <button
              onClick={() => {
                setIsEditing(true);
                setEditText(message.content);
              }}
              className="mt-1 flex items-center gap-1 opacity-0 group-hover/msg:opacity-100 transition-opacity px-2 py-0.5 rounded hover:bg-neutral-100 dark:hover:bg-dark-quaternary text-[10px] text-ink-tertiary dark:text-neutral-500 cursor-pointer"
              title="Edit message"
            >
              <Pencil className="size-2.5" />
              <span>Edit</span>
            </button>
          )}
        </div>

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

        {/* Content — NO left padding/indent, full width */}
        <div className="w-full">
          {message.isError ? (
            <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40">
              <p className="text-xs font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5 mb-1.5">
                <AlertTriangle className="size-3.5" />
                Something went wrong
              </p>
              <MarkdownRenderer
                content={message.content}
                className="text-red-700 dark:text-red-300 selectable"
              />
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
