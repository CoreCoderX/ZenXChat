"use client";

import { Code2, Layout, ChevronDown, PanelLeft, Settings, Sun, Moon, Monitor, GitCompare } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { useTheme } from "@/hooks/useTheme";
import Button from "@/components/ui/Button";
import Toggle from "@/components/ui/Toggle";
import Tooltip from "@/components/ui/Tooltip";
import { truncate } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function ChatHeader() {
  const conversation = useChatStore((s) => s.getActiveConversation());
  const setConversationCodeMode = useChatStore(
    (s) => s.setConversationCodeMode
  );
  const { selectedModel, codeMode, toggleCodeMode, apiKeys } = useSettingsStore();
  const {
    splitViewEnabled,
    toggleSplitView,
    openModal,
    sidebarOpen,
    toggleSidebar,
    compareMode,
    toggleCompareMode,
  } = useUIStore();
  const { theme, toggleTheme } = useTheme();

  const model = conversation?.model ?? selectedModel;
  const modelName = model.includes("/") ? model.split("/").pop()! : model;
  const isCodeMode = conversation?.isCodeMode ?? codeMode;
  const hasApiKey = apiKeys.length > 0;

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  const handleCodeModeToggle = (checked: boolean) => {
    if (conversation) {
      setConversationCodeMode(conversation.id, checked);
    } else {
      toggleCodeMode();
    }
  };

  return (
    <div className="flex-shrink-0 flex items-center justify-between px-3 md:px-4 py-2 border-b border-slate-200/60 dark:border-dark-border/40 bg-slate-50 dark:bg-dark pt-[calc(env(safe-area-inset-top)+8px)] md:pt-2">
      {/* Left controls: Sidebar toggle & Model selection */}
      <div className="flex items-center gap-2 min-w-0">
        {!sidebarOpen && (
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="lg:hidden flex-shrink-0 p-1.5"
            title="Open Sidebar"
          >
            <PanelLeft className="size-4 text-ink-secondary dark:text-neutral-400" />
          </Button>
        )}

        {/* Sleek Model dropdown button */}
        <button
          onClick={() => openModal("settings", { tab: "models" })}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-neutral-200 dark:border-dark-border/60 bg-white dark:bg-dark-secondary hover:bg-neutral-50 dark:hover:bg-dark-tertiary shadow-sm transition-all duration-150 min-w-0 cursor-pointer text-left"
        >
          <div className="size-1.5 rounded-full bg-emerald-500 flex-shrink-0 animate-pulse" />
          <span className="text-xs font-semibold text-ink dark:text-neutral-100 truncate max-w-[120px] sm:max-w-[200px]">
            {truncate(modelName, 24)}
          </span>
          <ChevronDown className="size-3 text-ink-tertiary dark:text-neutral-500 flex-shrink-0" />
        </button>
      </div>

      {/* Right controls: Theme, Code Mode, Live Preview, Settings, API Warning */}
      <div className="flex items-center gap-1">
        {/* API Key Warning */}
        {!hasApiKey && (
        <Button
          variant="outline"
          size="xs"
          onClick={() => openModal("settings")}
          className="flex-shrink-0 whitespace-nowrap border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-2 py-1"
        >
          <span className="sm:hidden">⚠</span>
          <span className="hidden sm:inline">⚠ Add Key</span>
        </Button>
        )}

        {/* Code Mode */}
        <Tooltip content="Code Mode — prioritises code responses">
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-dark-tertiary transition-colors cursor-pointer select-none">
            <Code2 className="size-3.5 text-ink-tertiary dark:text-neutral-500" />
            <span className="text-[10px] font-medium text-ink-secondary dark:text-neutral-400 hidden sm:block">
              Code
            </span>
            <Toggle
              size="sm"
              checked={isCodeMode}
              onChange={handleCodeModeToggle}
            />
          </div>
        </Tooltip>

        {/* Compare Models Toggle */}
        <Tooltip content={compareMode ? "Exit compare mode" : "Compare models side by side"}>
          <Button
            variant={compareMode ? "default" : "ghost"}
            size="sm"
            onClick={toggleCompareMode}
            className={cn(
              "rounded-lg p-1.5 text-ink-secondary dark:text-neutral-400 hover:text-ink dark:hover:text-neutral-100",
              compareMode
                ? "bg-neutral-200/80 dark:bg-dark-tertiary text-ink dark:text-white"
                : ""
            )}
          >
            <GitCompare className="size-4" />
          </Button>
        </Tooltip>

        {/* Live Preview Toggle */}
        <Tooltip content={splitViewEnabled ? "Close preview" : "Open live preview"}>
          <Button
            variant={splitViewEnabled ? "default" : "ghost"}
            size="sm"
            onClick={toggleSplitView}
            className={cn(
              "rounded-lg p-1.5 text-ink-secondary dark:text-neutral-400 hover:text-ink dark:hover:text-neutral-100",
              splitViewEnabled ? "bg-neutral-200/80 dark:bg-dark-tertiary text-ink dark:text-white" : ""
            )}
          >
            <Layout className="size-4" />
          </Button>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip content={`Theme: ${theme}`}>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="p-1.5 text-ink-secondary dark:text-neutral-400 hover:text-ink dark:hover:text-neutral-100"
          >
            <ThemeIcon className="size-4" />
          </Button>
        </Tooltip>

        {/* Settings button */}
        <Tooltip content="Settings">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openModal("settings")}
            className="p-1.5 text-ink-secondary dark:text-neutral-400 hover:text-ink dark:hover:text-neutral-100"
          >
            <Settings className="size-4" />
          </Button>
        </Tooltip>
      </div>
    </div>
  );
}
