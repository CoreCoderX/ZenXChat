"use client";

import { useRef, useCallback, KeyboardEvent, useState, useEffect, useMemo } from "react";
import TextareaAutosize from "react-textarea-autosize";
import {
  ArrowUp,
  Square,
  Paperclip,
  X,
  Image as ImageIcon,
  FileText,
  Globe,
  Brain,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/store/settingsStore";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import { AttachedFile } from "@/types";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { v4 as uuidv4 } from "uuid";

interface ChatInputProps {
  onSend: (content: string, attachments?: AttachedFile[], webSearch?: boolean) => void;
  isGenerating: boolean;
  onStop: () => void;
  placeholder?: string;
}

// File size limit: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Accepted file types
const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
  "application/json",
  "application/pdf",
  "text/javascript",
  "text/typescript",
  "text/html",
  "text/css",
];

export default function ChatInput({
  onSend,
  isGenerating,
  onStop,
  placeholder = "Message…",
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<AttachedFile[]>([]);
  const [webSearchOn, setWebSearchOn] = useState(false);
  const [thinkingOn, setThinkingOn] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showOptions, setShowOptions] = useState(false);

  const { sendOnEnter, selectedModel } = useSettingsStore();
  const conversation = useChatStore((s) => s.getActiveConversation());
  const { isGenerating: globalGenerating } = useUIStore();

  const currentModelId = conversation?.model || selectedModel;

  // Dynamically calculate model capabilities based on model ID
  const capabilities = useMemo(() => {
    const id = currentModelId.toLowerCase();
    
    // Check files / vision support
    const supportsFiles = 
      id.includes("gemini") || 
      id.includes("gpt-4o") || 
      id.includes("claude-3") || 
      id.includes("vision") || 
      id.includes("pixtral") || 
      id.includes("grok-2-vision");

    // Check search / research support
    const supportsSearch = 
      id.includes("online") || 
      id.includes("search") || 
      id.includes("perplexity") || 
      id.includes("grok") || 
      id.includes("gemini-2.0") || 
      id.includes("gemini-2.5");

    // Check thinking / reasoning support
    const supportsThinking = 
      id.includes("r1") || 
      id.includes("o1") || 
      id.includes("o3") || 
      id.includes("reasoning") || 
      id.includes("thinking");

    return { supportsFiles, supportsSearch, supportsThinking };
  }, [currentModelId]);

  // Check if current input represents a multiline card shape instead of a single-line pill
  const isMultiline = useMemo(() => {
    return attachments.length > 0 || value.includes("\n") || value.length > 80;
  }, [attachments, value]);

  // Sync capabilities with states
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebSearchOn(capabilities.supportsSearch);
  }, [capabilities.supportsSearch]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThinkingOn(capabilities.supportsThinking);
  }, [capabilities.supportsThinking]);

  const canSend =
    (value.trim().length > 0 || attachments.length > 0) && !isGenerating;

  // ── Handle file processing ────────────────────────────────────────────────

  const processFile = useCallback(
    async (file: File): Promise<AttachedFile | null> => {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" is too large. Max size is 10 MB.`);
        return null;
      }

      if (
        !ACCEPTED_TYPES.includes(file.type) &&
        !file.name.match(
          /\.(txt|md|csv|json|js|ts|tsx|jsx|html|css|py|java|c|cpp|rs|go)$/i,
        )
      ) {
        alert(`File type "${file.type}" is not supported.`);
        return null;
      }

      return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          const content = e.target?.result as string;

          const attached: AttachedFile = {
            id: uuidv4(),
            name: file.name,
            type: file.type,
            size: file.size,
            content: content,
            preview: file.type.startsWith("image/") ? content : undefined,
          };

          resolve(attached);
        };

        reader.onerror = () => resolve(null);

        if (file.type.startsWith("image/")) {
          reader.readAsDataURL(file);
        } else {
          reader.readAsText(file);
        }
      });
    },
    [],
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      const processed = await Promise.all(fileArray.map(processFile));
      const valid = processed.filter((f): f is AttachedFile => f !== null);
      setAttachments((prev) => [...prev, ...valid].slice(0, 5)); // Max 5 files
    },
    [processFile],
  );

  // ── File input change ─────────────────────────────────────────────────────

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(e.target.files);
    e.target.value = ""; // Reset so same file can be reselected
  };

  // ── Drag and drop ─────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
  };

  // ── Paste image ───────────────────────────────────────────────────────────

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageItems: File[] = [];
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageItems.push(file);
        }
      }
      if (imageItems.length > 0) handleFiles(imageItems);
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [handleFiles]);

  // ── Remove attachment ─────────────────────────────────────────────────────

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // ── Send ──────────────────────────────────────────────────────────────────

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend(value, attachments.length > 0 ? attachments : undefined, webSearchOn);
    setValue("");
    setAttachments([]);
  }, [canSend, onSend, value, attachments, webSearchOn]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      // Disable send-on-enter for mobile virtual keyboards to allow newlines
      const isMobileDevice = typeof window !== "undefined" && (
        /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) || 
        window.matchMedia("(max-width: 1023px)").matches
      );

      if (e.key === "Enter" && sendOnEnter && !e.shiftKey && !isMobileDevice) {
        e.preventDefault();
        handleSend();
      }
    },
    [sendOnEnter, handleSend],
  );


  return (
    <div
      className="relative w-full"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Main floating card container */}
      <div
        className={cn(
          "flex flex-col gap-1.5 p-1.5 border transition-[border-color,background-color,box-shadow,transform] duration-200",
          isMultiline ? "rounded-[24px]" : "rounded-full",
          "bg-white/95 dark:bg-dark-secondary/95 backdrop-blur-md",
          "border-neutral-200/80 dark:border-dark-border/80",
          "focus-within:border-neutral-300 dark:focus-within:border-neutral-700",
          "shadow-lg dark:shadow-2xl focus-within:shadow-xl",
          isDragging && cn(
            "bg-neutral-50/90 dark:bg-dark-tertiary/90 border-dashed border-neutral-400 dark:border-neutral-600",
            isMultiline ? "rounded-[24px]" : "rounded-full"
          )
        )}
      >
        {/* Drag overlay */}
        {isDragging && (
          <div className={cn(
            "absolute inset-0 z-10 flex items-center justify-center bg-neutral-50/95 dark:bg-dark-tertiary/95 pointer-events-none",
            isMultiline ? "rounded-[24px]" : "rounded-full"
          )}>
            <p className="text-sm font-medium text-ink-secondary dark:text-neutral-400 animate-pulse">
              Drop files to attach
            </p>
          </div>
        )}

        {/* Attachment previews inside the card (only shown when there are attachments) */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 px-1.5 pb-1.5 border-b border-neutral-100 dark:border-dark-border/40 overflow-hidden"
            >
              {attachments.map((file) => (
                <motion.div
                  key={file.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="relative group flex items-center gap-1.5 bg-neutral-100 dark:bg-dark-tertiary rounded-xl px-2 py-1 max-w-[180px] border border-neutral-200/50 dark:border-dark-border/30"
                >
                  {/* File icon or thumbnail */}
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="size-6 object-cover rounded flex-shrink-0"
                    />
                  ) : file.type.startsWith("image/") ? (
                    <ImageIcon className="size-3.5 text-ink-tertiary flex-shrink-0" />
                  ) : (
                    <FileText className="size-3.5 text-ink-tertiary flex-shrink-0" />
                  )}

                  {/* File info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-ink dark:text-neutral-100 truncate font-medium">
                      {file.name}
                    </p>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={() => removeAttachment(file.id)}
                    className="flex-shrink-0 size-4 rounded-full bg-neutral-200 dark:bg-dark-quaternary flex items-center justify-center hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors ml-1"
                  >
                    <X className="size-2.5 text-ink-secondary dark:text-neutral-400" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Linear Row */}
        <div className="flex items-center gap-1">
          {/* Capability Buttons Expandable Toggle */}
          <div className="relative flex items-center flex-shrink-0">
            <Tooltip content="Show features (Upload, Research, Thinking)">
              <button
                type="button"
                onClick={() => setShowOptions((prev) => !prev)}
                className="flex items-center justify-center size-8 rounded-full bg-neutral-100 hover:bg-neutral-200 dark:bg-dark-quaternary dark:hover:bg-dark-tertiary text-ink-secondary dark:text-neutral-300 transition-all cursor-pointer"
              >
                <Plus className={cn("size-4 transition-transform duration-200", showOptions && "rotate-45")} />
              </button>
            </Tooltip>

            {/* Expandable Options Popover Menu */}
            <AnimatePresence>
              {showOptions && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  className="absolute bottom-11 left-0 z-30 w-48 flex flex-col bg-white dark:bg-dark-secondary border border-neutral-200 dark:border-dark-border rounded-xl shadow-lg py-1 overflow-hidden"
                >
                  {/* File Upload */}
                  <button
                    type="button"
                    disabled={!capabilities.supportsFiles}
                    onClick={() => {
                      fileInputRef.current?.click();
                      setShowOptions(false);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-neutral-100 dark:border-dark-border/20 last:border-0",
                      capabilities.supportsFiles
                        ? "hover:bg-neutral-50 dark:hover:bg-dark-tertiary cursor-pointer"
                        : "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <Paperclip className={cn(
                      "size-4 flex-shrink-0",
                      attachments.length > 0 ? "text-neutral-900 dark:text-white" : "text-ink-secondary dark:text-neutral-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink dark:text-neutral-200">Upload Files</p>
                    </div>
                    {attachments.length > 0 && (
                      <span className="text-[10px] font-semibold text-neutral-900 dark:text-white bg-neutral-100 dark:bg-dark-tertiary px-1.5 py-0.25 rounded-md">
                        {attachments.length}
                      </span>
                    )}
                  </button>

                  {/* Web Search */}
                  <button
                    type="button"
                    disabled={!capabilities.supportsSearch}
                    onClick={() => {
                      setWebSearchOn((prev) => !prev);
                      setShowOptions(false);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-left transition-colors border-b border-neutral-100 dark:border-dark-border/20 last:border-0",
                      capabilities.supportsSearch
                        ? "hover:bg-neutral-50 dark:hover:bg-dark-tertiary cursor-pointer"
                        : "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <Globe className={cn(
                      "size-4 flex-shrink-0",
                      webSearchOn ? "text-emerald-500" : "text-ink-secondary dark:text-neutral-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink dark:text-neutral-200">Web Search</p>
                    </div>
                    {webSearchOn && (
                      <span className="text-[9px] font-bold text-emerald-500 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </button>

                  {/* Thinking */}
                  <button
                    type="button"
                    disabled={!capabilities.supportsThinking}
                    onClick={() => {
                      setThinkingOn((prev) => !prev);
                      setShowOptions(false);
                    }}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-2 text-left transition-colors",
                      capabilities.supportsThinking
                        ? "hover:bg-neutral-50 dark:hover:bg-dark-tertiary cursor-pointer"
                        : "opacity-30 cursor-not-allowed"
                    )}
                  >
                    <Brain className={cn(
                      "size-4 flex-shrink-0",
                      thinkingOn ? "text-purple-500" : "text-ink-secondary dark:text-neutral-400"
                    )} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink dark:text-neutral-200">Thinking</p>
                    </div>
                    {thinkingOn && (
                      <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wider">
                        Active
                      </span>
                    )}
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Vertical Divider */}
          <div className="w-px h-5 bg-neutral-200 dark:bg-dark-border/40 self-center mx-1 flex-shrink-0" />

          {/* Textarea */}
          <div className="flex-1 min-w-0">
            <TextareaAutosize
              ref={textareaRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                webSearchOn
                  ? "Search the web…"
                  : attachments.length > 0
                    ? "Ask about the attachments…"
                    : placeholder
              }
              minRows={1}
              maxRows={6}
              className={cn(
                "w-full resize-none bg-transparent outline-none",
                "text-sm text-ink dark:text-neutral-100",
                "placeholder:text-ink-muted dark:placeholder:text-neutral-600",
                "py-1.5 px-1 leading-relaxed",
                "text-[16px] md:text-[14px]",
              )}
              disabled={globalGenerating && !isGenerating}
            />
          </div>

          {/* Send / Stop Action Button */}
          <div className="flex-shrink-0 self-center pl-1">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div
                  key="stop"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={onStop}
                    className="rounded-xl p-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-neutral-100 dark:hover:bg-neutral-200 text-white dark:text-neutral-900 flex items-center justify-center size-8"
                  >
                    <Square className="size-3.5 fill-current" />
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="send"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleSend}
                    disabled={!canSend}
                    className={cn(
                      "rounded-xl p-1.5 transition-all duration-150 flex items-center justify-center size-8",
                      canSend
                        ? "bg-neutral-950 hover:bg-neutral-900 text-white dark:bg-neutral-50 dark:hover:bg-white dark:text-neutral-900 shadow-md active:scale-95 cursor-pointer"
                        : "bg-neutral-100 text-neutral-300 dark:bg-dark-tertiary dark:text-neutral-600 cursor-not-allowed"
                    )}
                    aria-label="Send message"
                  >
                    <ArrowUp className="size-3.5 stroke-[2.5]" />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
