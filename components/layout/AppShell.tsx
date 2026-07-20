"use client";

import { useEffect } from "react";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { useTheme } from "@/hooks/useTheme";
import { useUIStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import Sidebar from "@/components/layout/Sidebar";
import ChatArea from "@/components/chat/ChatArea";
import SettingsModal from "@/components/settings/SettingsModal";
import ConfirmModal from "@/components/ui/ConfirmModal";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";
import { Settings, Sun, Moon, Monitor, PanelLeft } from "lucide-react";

export default function AppShell() {
  useKeyboardShortcuts();

  const { theme, toggleTheme } = useTheme();
  const { openModal, sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();
  const { apiKeys } = useSettingsStore();
  const hasApiKey = apiKeys.length > 0;

  // Lock sidebar to open in desktop mode (>= 1024px width)
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  const ThemeIcon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;

  return (
    // Root: fill viewport, no overflow, no position:fixed (let CSS handle it)
    <div
      className="flex bg-slate-50 dark:bg-dark"
      style={{
        width: "100vw",
        height: "100dvh", // dvh respects mobile browser chrome
        overflow: "hidden",
        position: "fixed", // Prevent body scroll on mobile
        top: 0,
        left: 0,
      }}
    >
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Chat — fills full space */}
        <div className="flex-1 min-h-0 overflow-hidden">
          <ChatArea />
        </div>
      </div>

      {/* Modals — rendered at root level so they are above everything */}
      <SettingsModal />
      <ConfirmModal />
    </div>
  );
}
