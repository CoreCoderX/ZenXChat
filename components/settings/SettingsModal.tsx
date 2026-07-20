"use client";

import { useState, useEffect } from "react";
import { Key, Cpu, Sliders, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import ApiKeyManager from "./ApiKeyManager";
import ModelSelector from "./ModelSelector";
import GeneralSettings from "./GeneralSettings";
import Button from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type SettingsTab = "models" | "api-keys" | "general" | "about";

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "models", label: "Models", icon: Cpu },
  { id: "api-keys", label: "API Keys", icon: Key },
  { id: "general", label: "General", icon: Sliders },
  { id: "about", label: "About", icon: Info },
];

export default function SettingsModal() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("models");
  const { activeModal, closeModal, modalData } = useUIStore();
  const isOpen = activeModal === "settings";

  // Sync active tab with the opening modal data payload
  useEffect(() => {
    if (isOpen) {
      const tab = (modalData?.tab as SettingsTab) || "models";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(tab);
    }
  }, [isOpen, modalData]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, closeModal]);

  return (
    <AnimatePresence>
      {isOpen && (
        // Full-viewport overlay — sits above everything
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center"
          style={{ isolation: "isolate" }}
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
            onClick={closeModal}
          />

          {/* Modal panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            // Stop clicks from closing via backdrop
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "relative z-10 flex flex-col overflow-hidden",
              "bg-white dark:bg-dark-secondary",
              "border border-neutral-200 dark:border-dark-border",
              "shadow-2xl",
              // Mobile: fill screen
              "w-full h-full rounded-none",
              // Desktop: centered box
              "md:w-[820px] md:max-w-[92vw]",
              "md:h-[72vh] md:max-h-[720px]",
              "md:rounded-2xl",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-100 dark:border-dark-border flex-shrink-0">
              <h2 className="text-base font-semibold text-ink dark:text-neutral-100">
                Settings
              </h2>
              <Button variant="ghost" size="sm" onClick={closeModal}>
                <X className="size-4" />
              </Button>
            </div>

            {/* Tab bar */}
            <div className="flex border-b border-neutral-100 dark:border-dark-border flex-shrink-0 overflow-x-auto scrollbar-hide">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={cn(
                    "flex items-center gap-2 px-5 py-3 text-sm",
                    "whitespace-nowrap flex-shrink-0 border-b-2 transition-colors",
                    "min-h-[48px]",
                    activeTab === id
                      ? "border-neutral-900 dark:border-neutral-100 text-ink dark:text-neutral-100 font-medium"
                      : "border-transparent text-ink-secondary dark:text-neutral-400 hover:text-ink dark:hover:text-neutral-200",
                  )}
                >
                  <Icon className="size-4 flex-shrink-0" />
                  {label}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-area">
              {activeTab === "models" && (
                <ModelSelector onSelect={closeModal} />
              )}
              {activeTab === "api-keys" && (
                <div className="p-4">
                  <ApiKeyManager />
                </div>
              )}
              {activeTab === "general" && (
                <div className="p-4">
                  <GeneralSettings />
                </div>
              )}
              {activeTab === "about" && (
                <div className="p-4">
                  <AboutSection />
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function AboutSection() {
  return (
    <div className="space-y-5 max-w-lg">
      <div className="flex items-center gap-3">
        <div className="size-10 rounded-xl bg-neutral-100 dark:bg-dark-tertiary flex items-center justify-center">
          <div className="size-4 rounded-full bg-neutral-500 dark:bg-neutral-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-ink dark:text-neutral-100">
            OpenRouter Chat
          </h3>
          <p className="text-xs text-ink-tertiary dark:text-neutral-500">
            Version 1.0.0
          </p>
        </div>
      </div>

      <p className="text-sm text-ink-secondary dark:text-neutral-400 leading-relaxed">
        A minimal AI chat interface powered by{" "}
        <a
          href="https://openrouter.ai"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          OpenRouter.ai
        </a>
        . Access 200+ AI models from one place.
      </p>

      <div className="space-y-1">
        <h4 className="text-xs font-medium text-ink-secondary dark:text-neutral-400 uppercase tracking-wider mb-2">
          Keyboard Shortcuts
        </h4>
        {[
          ["⌘K", "New chat"],
          ["⌘B", "Toggle sidebar"],
          ["⌘,", "Open settings"],
          ["Esc", "Close / Stop generation"],
          ["Enter", "Send message"],
          ["Shift+Enter", "New line"],
        ].map(([key, desc]) => (
          <div
            key={key}
            className="flex items-center justify-between py-1.5 border-b border-neutral-50 dark:border-dark-border last:border-0"
          >
            <span className="text-xs text-ink-tertiary dark:text-neutral-500">
              {desc}
            </span>
            <kbd className="text-[10px] font-mono bg-neutral-100 dark:bg-dark-tertiary px-2 py-0.5 rounded border border-neutral-200 dark:border-dark-border text-ink-secondary dark:text-neutral-400">
              {key}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  );
}
