"use client";

import { motion } from "framer-motion";
import { Globe, Brain, Sparkles, Loader2 } from "lucide-react";
import { useSettingsStore } from "@/store/settingsStore";
import { useChatStore } from "@/store/chatStore";
import { cn } from "@/lib/utils";

export default function TypingIndicator() {
  const conversation = useChatStore((s) => s.getActiveConversation());
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const currentModelId = conversation?.model || selectedModel;

  const modelLower = currentModelId.toLowerCase();

  const isSearch =
    modelLower.includes("online") ||
    modelLower.includes("search") ||
    modelLower.includes("perplexity") ||
    modelLower.includes("grok");

  const isThinking =
    modelLower.includes("r1") ||
    modelLower.includes("o1") ||
    modelLower.includes("o3") ||
    modelLower.includes("reasoning") ||
    modelLower.includes("thinking");

  // Determine indicator look and feel
  let icon = <Loader2 className="size-3.5 animate-spin text-neutral-500" />;
  let label = "Responding...";
  let colorClass = "bg-neutral-100 dark:bg-dark-tertiary text-neutral-700 dark:text-neutral-300 border border-neutral-200/50 dark:border-dark-border/50";

  if (isSearch) {
    icon = <Globe className="size-3.5 animate-pulse text-emerald-500" />;
    label = "Searching the web...";
    colorClass = "bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200/40 dark:border-emerald-900/20 shadow-sm shadow-emerald-500/5";
  } else if (isThinking) {
    icon = <Brain className="size-3.5 animate-bounce text-purple-500" style={{ animationDuration: "1.2s" }} />;
    label = "Thinking...";
    colorClass = "bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-400 border border-purple-200/40 dark:border-purple-900/20 shadow-sm shadow-purple-500/5";
  } else {
    icon = (
      <div className="flex items-center gap-1 px-0.5">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="size-1 rounded-full bg-neutral-500 dark:bg-neutral-400"
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>
    );
    label = "Formulating response...";
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 select-none">
      {/* AI avatar dot */}
      <div className="size-7 rounded-full bg-neutral-200 dark:bg-dark-quaternary flex-shrink-0 flex items-center justify-center">
        <Sparkles className="size-3.5 text-neutral-500 dark:text-neutral-400" />
      </div>

      {/* Custom status bubble */}
      <motion.div
        initial={{ opacity: 0, y: 4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.15 }}
        className={cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-2xl text-[11px] font-medium shadow-sm transition-all duration-300",
          colorClass
        )}
      >
        <div className="flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <span>{label}</span>
      </motion.div>
    </div>
  );
}
