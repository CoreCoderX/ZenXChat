"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Settings, PanelLeftClose, Trash2, Search } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import ConversationList from "./ConversationList";
import Button from "@/components/ui/Button";
import Image from "next/image";

export default function Sidebar() {
  const {
    conversations,
    activeConversationId,
    createConversation,
    clearAllConversations,
  } = useChatStore();
  const { selectedModel } = useSettingsStore();
  const { sidebarOpen, toggleSidebar, openModal } = useUIStore();

  const [searchQuery, setSearchQuery] = useState("");

  const handleNewChat = () => {
    createConversation(selectedModel);
    // Auto-close sidebar on mobile after creating chat
    if (window.innerWidth < 1024) toggleSidebar();
  };

  // Filter and sort conversations by latest activity (updatedAt descending)
  const sortedConversations = conversations
    .filter((c) => c.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className={[
              "flex flex-col h-full overflow-hidden",
              "border-r border-neutral-200 dark:border-dark-border",
              "bg-neutral-50 dark:bg-dark-secondary",
              "w-[280px] flex-shrink-0",
              // On mobile: fixed overlay; on desktop: part of layout
              "fixed lg:relative z-30 lg:z-auto",
              "top-0 left-0 bottom-0",
              "rounded-r-xl lg:rounded-r-2xl", // minimal curl as requested
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 pb-3 pt-[calc(env(safe-area-inset-top)+12px)] lg:pt-3 border-b border-neutral-100 dark:border-dark-border flex-shrink-0">
              <div className="flex items-center gap-2 px-1">
                <Image
                  src="/icon.png"
                  alt="ZenXChat Logo"
                  width={24}
                  height={24}
                  className="rounded-md"
                  priority
                />
                <span className="text-sm font-semibold text-ink dark:text-neutral-100">
                  ZenXChat
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={toggleSidebar} className="lg:hidden">
                <PanelLeftClose className="size-4" />
              </Button>
            </div>

            {/* Conversation list — scrollable */}
            <div className="flex-1 min-h-0 sidebar-scroll">
              <ConversationList
                conversations={sortedConversations}
                activeId={activeConversationId}
                onSelect={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
              />
            </div>

            {/* Footer with Search bar and actions */}
            <div className="border-t border-neutral-100 dark:border-dark-border p-3 space-y-2 flex-shrink-0">
              {/* History Search Bar */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-muted dark:text-neutral-600" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search history..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-tertiary text-ink dark:text-neutral-100 placeholder:text-ink-muted dark:placeholder:text-neutral-600 outline-none focus:border-neutral-300 dark:focus:border-neutral-600 transition-colors"
                />
              </div>

              {/* Actions row: New Chat & Settings */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNewChat}
                  className="flex-1 justify-center gap-1 min-h-[36px] px-2"
                >
                  <Plus className="size-3.5" />
                  <span className="text-xs">New Chat</span>
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    openModal("settings");
                    if (window.innerWidth < 1024) toggleSidebar();
                  }}
                  className="flex-1 justify-center gap-1 min-h-[36px] px-2 border border-neutral-200/50 dark:border-dark-border/40 hover:bg-neutral-100 dark:hover:bg-dark-tertiary"
                >
                  <Settings className="size-3.5" />
                  <span className="text-xs">Settings</span>
                </Button>
              </div>

              {/* Clear conversations */}
              {conversations.length > 0 && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="w-full justify-center text-[10px] text-red-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/20"
                  onClick={() => {
                    openModal("delete", {
                      title: "Clear all chats?",
                      message: "Are you sure you want to clear all conversations? This cannot be undone.",
                      confirmText: "Clear All",
                      cancelText: "Cancel",
                      onConfirm: () => clearAllConversations(),
                    });
                  }}
                >
                  <Trash2 className="size-3" />
                  <span>Clear All</span>
                </Button>
              )}
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
