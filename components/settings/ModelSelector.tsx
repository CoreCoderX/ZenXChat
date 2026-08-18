"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Grid3X3,
  Sparkles,
  TrendingUp,
  Bot,
  MessageSquare,
  Gem,
  Code2,
  Image,
  Mic,
  Globe,
  RefreshCw,
  Check,
  Brain,
  Wrench,
  Braces,
  Eye,
  StretchHorizontal,
} from "lucide-react";
import { useModels } from "@/hooks/useModels";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { ModelCategory, ModelFilter } from "@/types";
import {
  filterModels,
  formatModelPrice,
  formatContextLength,
  getProviderDisplayName,
} from "@/lib/models";
import { MODEL_FILTERS } from "@/lib/models";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn } from "@/lib/utils";

// Map filter icon names to Lucide components
const ICON_MAP: Record<string, React.ElementType> = {
  Grid: Grid3X3,
  Sparkles,
  TrendingUp,
  Bot,
  MessageSquare,
  Gem,
  Code2,
  Image,
  Mic,
  Globe,
  Brain,
  Wrench,
  Braces,
  Eye,
  StretchHorizontal,
};

interface ModelSelectorProps {
  onSelect?: () => void;
}

export default function ModelSelector({ onSelect }: ModelSelectorProps) {
  const [selectedCategory, setSelectedCategory] =
    useState<ModelCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { allModels, isLoading, error, refreshModels } = useModels();
  const conversation = useChatStore((s) => s.getActiveConversation());
  const setConversationModel = useChatStore((s) => s.setConversationModel);
  const { selectedModel, setSelectedModel } = useSettingsStore();

  const currentModel = conversation?.model || selectedModel;

  // Filter models based on category and search
  const filteredModels = useMemo(
    () => filterModels(allModels, selectedCategory, searchQuery),
    [allModels, selectedCategory, searchQuery],
  );

  const handleSelectModel = (modelId: string) => {
    setSelectedModel(modelId);
    if (conversation) {
      setConversationModel(conversation.id, modelId);
    }
    onSelect?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      <div className="p-4 border-b border-neutral-100 dark:border-dark-border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-ink-muted dark:text-neutral-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search models..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-neutral-200 dark:border-dark-border bg-neutral-50 dark:bg-dark-tertiary text-ink dark:text-neutral-100 placeholder:text-ink-muted dark:placeholder:text-neutral-600 outline-none focus:border-neutral-300 dark:focus:border-neutral-700 transition-colors"
          />
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto border-b border-neutral-100 dark:border-dark-border scrollbar-hide">
        {MODEL_FILTERS.map((filter: ModelFilter) => {
          const Icon = ICON_MAP[filter.icon] || Grid3X3;
          const isActive = selectedCategory === filter.category;

          return (
            <button
              key={filter.category}
              onClick={() => setSelectedCategory(filter.category)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex-shrink-0",
                isActive
                  ? "bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900"
                  : "bg-neutral-100 dark:bg-dark-tertiary text-ink-secondary dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-dark-quaternary",
              )}
            >
              <Icon className="size-3" />
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* Model count + refresh */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-xs text-ink-muted dark:text-neutral-600">
          {filteredModels.length} model{filteredModels.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="ghost"
          size="xs"
          onClick={refreshModels}
          disabled={isLoading}
        >
          <RefreshCw className={cn("size-3", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Model list */}
      <div className="flex-1 overflow-y-auto min-h-0 chat-scroll">
        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-lg flex-shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-2.5 w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-4 text-center">
            <p className="text-sm text-red-500">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshModels}
              className="mt-2"
            >
              Retry
            </Button>
          </div>
        ) : filteredModels.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-ink-tertiary dark:text-neutral-500">
              No models found
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-0.5">
            {filteredModels.map((model) => {
              const isSelected = model.id === currentModel;

              return (
                <motion.button
                  key={model.id}
                  onClick={() => handleSelectModel(model.id)}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.1 }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                    isSelected
                      ? "bg-neutral-100 dark:bg-dark-tertiary"
                      : "hover:bg-neutral-50 dark:hover:bg-dark-secondary",
                  )}
                >
                  {/* Provider initial avatar */}
                  <div className="size-8 rounded-lg bg-neutral-100 dark:bg-dark-quaternary flex items-center justify-center flex-shrink-0 text-xs font-semibold text-ink-secondary dark:text-neutral-500 uppercase">
                    {model.provider.slice(0, 2)}
                  </div>

                  {/* Model info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-ink dark:text-neutral-100 truncate">
                        {model.name}
                      </span>
                      {model.isFree && <Badge variant="free">Free</Badge>}
                      {model.isPopular && (
                        <Badge variant="popular">Popular</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px] text-ink-muted dark:text-neutral-600">
                        {getProviderDisplayName(model.provider)}
                      </span>
                      <span className="text-[11px] text-ink-muted dark:text-neutral-600">
                        ·
                      </span>
                      <span className="text-[11px] text-ink-muted dark:text-neutral-600">
                        {formatContextLength(model.context_length)}
                      </span>
                      <span className="text-[11px] text-ink-muted dark:text-neutral-600">
                        ·
                      </span>
                      <span className="text-[11px] text-ink-muted dark:text-neutral-600">
                        {formatModelPrice(model.pricing)}
                      </span>
                    </div>
                  </div>

                  {/* Selected checkmark */}
                  {isSelected && (
                    <Check className="size-4 text-ink dark:text-neutral-100 flex-shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
