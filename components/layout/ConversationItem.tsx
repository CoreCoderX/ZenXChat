"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Trash2, Check, X, MessageSquare } from "lucide-react";
import { Conversation } from "@/types";
import { useChatStore } from "@/store/chatStore";
import { useUIStore } from "@/store/uiStore";
import { cn } from "@/lib/utils";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d === 1) return "1d";
  if (d < 7) return `${d}d`;
  return new Date(ts).toLocaleDateString("en", { month: "short", day: "numeric" });
}

function getShortModel(model: string): string {
  const name = model.includes("/") ? model.split("/").pop()! : model;
  // Strip common suffixes to shorten
  return name
    .replace(/-instruct|-chat|-turbo|-latest|-preview/gi, "")
    .slice(0, 18);
}

// ── ConversationItem ──────────────────────────────────────────────────────────

interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onSelect?: () => void;
  index: number;
}

export function ConversationItem({
  conversation,
  isActive,
  onSelect,
  index,
}: ConversationItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  const { selectConversation, deleteConversation, renameConversation } = useChatStore();
  const { openModal } = useUIStore();

  useEffect(() => {
    if (isRenaming) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isRenaming]);

  const handleSelect = () => {
    if (isRenaming) return;
    selectConversation(conversation.id);
    onSelect?.();
  };

  const handleRenameSubmit = () => {
    if (renameValue.trim()) renameConversation(conversation.id, renameValue.trim());
    setIsRenaming(false);
  };

  const msgCount = conversation.messages?.length ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15, delay: Math.min(index * 0.025, 0.25) }}
      className={cn(
        "group relative mx-2 mb-px rounded-lg cursor-pointer transition-colors duration-100",
        isActive
          ? "bg-neutral-900 dark:bg-white/10"
          : "hover:bg-neutral-100 dark:hover:bg-white/5",
      )}
      onClick={handleSelect}
    >
      <div className="pl-4 pr-2 py-2.5">
        {isRenaming ? (
          /* ── Rename mode ── */
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <input
              ref={inputRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") { setRenameValue(conversation.title); setIsRenaming(false); }
              }}
              onBlur={handleRenameSubmit}
              className="flex-1 text-[11px] bg-transparent outline-none border-b border-neutral-400 dark:border-neutral-500 text-ink dark:text-neutral-100 pb-px"
            />
            <button onClick={handleRenameSubmit} className="text-emerald-500 hover:text-emerald-400 p-0.5 flex-shrink-0">
              <Check className="size-3" />
            </button>
            <button onClick={() => { setRenameValue(conversation.title); setIsRenaming(false); }} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 p-0.5 flex-shrink-0">
              <X className="size-3" />
            </button>
          </div>
        ) : (
          /* ── Normal mode ── */
          <div className="flex items-center gap-2">
            {/* Title */}
            <p className={cn(
              "text-[12px] font-medium truncate flex-1 leading-snug",
              isActive
                ? "text-white dark:text-neutral-100"
                : "text-neutral-800 dark:text-neutral-300"
            )}>
              {conversation.title}
            </p>

            {/* Right side: time + actions — always visible */}
            <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Timestamp */}
              <span className={cn(
                "text-[10px] font-mono",
                isActive
                  ? "text-white/50 dark:text-white/40"
                  : "text-neutral-400 dark:text-neutral-600"
              )}>
                {getRelativeTime(conversation.updatedAt)}
              </span>

              {/* Divider */}
              <span className={cn(
                "text-[10px]",
                isActive ? "text-white/20" : "text-neutral-300 dark:text-neutral-700"
              )}>·</span>

              {/* Action buttons — always shown */}
              <div className="flex items-center gap-0.5">
                <button
                  onClick={() => setIsRenaming(true)}
                  title="Rename"
                  className={cn(
                    "flex items-center justify-center size-6 rounded-md transition-colors",
                    isActive
                      ? "text-white/50 hover:text-white hover:bg-white/10"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-white/10"
                  )}
                >
                  <Pencil className="size-3" />
                </button>
                <button
                  onClick={() => {
                    openModal("delete", {
                      title: "Delete chat?",
                      message: `Are you sure you want to delete "${conversation.title}"? This cannot be undone.`,
                      confirmText: "Delete",
                      cancelText: "Cancel",
                      onConfirm: () => deleteConversation(conversation.id),
                    });
                  }}
                  title="Delete"
                  className={cn(
                    "flex items-center justify-center size-6 rounded-md transition-colors",
                    isActive
                      ? "text-white/50 hover:text-red-300 hover:bg-red-500/20"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                  )}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Message count — subtle, below title */}
        {!isRenaming && (
          <div className="flex items-center gap-1 mt-0.5">
            <MessageSquare className={cn(
              "size-2.5 flex-shrink-0",
              isActive ? "text-white/30 dark:text-white/30" : "text-neutral-400 dark:text-neutral-600"
            )} />
            <span className={cn(
              "text-[9px] font-mono",
              isActive ? "text-white/40 dark:text-white/30" : "text-neutral-400 dark:text-neutral-600"
            )}>
              {msgCount} {msgCount === 1 ? "message" : "messages"}
            </span>
            <span className={cn(
              "text-[9px] font-mono truncate ml-auto max-w-[90px]",
              isActive ? "text-white/30 dark:text-white/30" : "text-neutral-400 dark:text-neutral-600"
            )}>
              {getShortModel(conversation.model)}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Date section label ────────────────────────────────────────────────────────

function SectionLabel({ label }: { label: string }) {
  return (
    <div className="px-4 pt-4 pb-1.5 select-none">
      <span className="text-[9px] font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-600">
        {label}
      </span>
    </div>
  );
}

// ── ConversationList ──────────────────────────────────────────────────────────

interface ConversationListProps {
  conversations: Conversation[];
  activeId: string | null;
  isLoading?: boolean;
  onSelect?: () => void;
}

function groupByDate(conversations: Conversation[]): { label: string; items: Conversation[] }[] {
  const now = Date.now();
  const day = 86_400_000;
  const buckets: { label: string; items: Conversation[] }[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This week", items: [] },
    { label: "This month", items: [] },
    { label: "Older", items: [] },
  ];

  for (const conv of conversations) {
    const diff = now - conv.updatedAt;
    if (diff < day) buckets[0].items.push(conv);
    else if (diff < 2 * day) buckets[1].items.push(conv);
    else if (diff < 7 * day) buckets[2].items.push(conv);
    else if (diff < 30 * day) buckets[3].items.push(conv);
    else buckets[4].items.push(conv);
  }

  return buckets.filter((b) => b.items.length > 0);
}

export default function ConversationList({
  conversations,
  activeId,
  isLoading,
  onSelect,
}: ConversationListProps) {
  if (isLoading) {
    return (
      <div className="px-2 py-3 space-y-1">
        {[80, 65, 72].map((w, i) => (
          <div key={i} className="flex items-center gap-2 mx-2 py-2.5">
            <div className={`h-3 bg-neutral-100 dark:bg-neutral-800 rounded animate-pulse`} style={{ width: `${w}%` }} />
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 gap-2">
        <MessageSquare className="size-6 text-neutral-300 dark:text-neutral-700" />
        <p className="text-xs text-neutral-400 dark:text-neutral-600 text-center">
          No chats yet
        </p>
      </div>
    );
  }

  const groups = groupByDate(conversations);
  let globalIndex = 0;

  return (
    <AnimatePresence initial={false}>
      <div className="py-1">
        {groups.map(({ label, items }) => (
          <div key={label}>
            <SectionLabel label={label} />
            {items.map((conv) => {
              const idx = globalIndex++;
              return (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeId}
                  onSelect={onSelect}
                  index={idx}
                />
              );
            })}
          </div>
        ))}
      </div>
    </AnimatePresence>
  );
}
