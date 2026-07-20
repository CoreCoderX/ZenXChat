"use client";

import { useState } from "react";
import {
  X,
  RefreshCw,
  ExternalLink,
  Maximize2,
  Minimize2,
  ArrowLeft,
  ArrowRight,
  Columns,
  AppWindow,
} from "lucide-react";
import { useUIStore } from "@/store/uiStore";
import LivePreview from "./LivePreview";
import Button from "@/components/ui/Button";
import Tooltip from "@/components/ui/Tooltip";

export default function SplitView() {
  const { previewContent, previewLanguage, toggleSplitView } = useUIStore();

  const [refreshKey, setRefreshKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleRefresh = () => setRefreshKey((k) => k + 1);

  const handleOpenInTab = () => {
    const closeBar = `<style>
#__bar{
  position:fixed;top:0;left:0;right:0;height:44px;
  background:#111;color:#fff;display:flex;
  align-items:center;justify-content:space-between;
  padding:0 14px;font-family:-apple-system,sans-serif;
  font-size:13px;z-index:2147483647;
  box-shadow:0 1px 8px rgba(0,0,0,.5);
}
#__bar span{opacity:.6;font-size:12px;}
#__bar .btns{display:flex;gap:8px;}
#__bar button{
  border:none;padding:5px 13px;border-radius:6px;
  cursor:pointer;font-size:12px;color:#fff;
  background:#333;font-family:inherit;
}
#__bar button:hover{background:#555;}
#__bar .cls{background:#b91c1c;}
#__bar .cls:hover{background:#dc2626;}
body{margin-top:44px!important;box-sizing:border-box;}
</style>
<div id="__bar">
  <span>ZenXChat · Preview</span>
  <div class="btns">
    <button onclick="history.back()">← Back</button>
    <button onclick="location.reload()">↺ Refresh</button>
    <button class="cls" onclick="window.close()">✕ Close Tab</button>
  </div>
</div>`;

    let html = previewContent;

    if (html.includes("<body")) {
      html = html.replace(/<body([^>]*)>/, `<body$1>\n${closeBar}`);
    } else if (
      html.trim().toLowerCase().startsWith("<!doctype") ||
      html.trim().toLowerCase().startsWith("<html")
    ) {
      html = html.replace("</body>", `${closeBar}\n</body>`);
    } else {
      html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:-apple-system,sans-serif;
         padding:1rem;font-size:14px;line-height:1.6;}
  </style>
</head>
<body>
${closeBar}
${previewContent}
</body>
</html>`;
    }

    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const tab = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
    if (!tab) alert("Popup blocked — please allow popups for this site.");
  };

  // Fullscreen: cover the entire viewport
  if (isFullscreen) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          display: "flex",
          flexDirection: "column",
          background: "#fff",
        }}
      >
        <Toolbar
          isFullscreen
          language={previewLanguage}
          onRefresh={handleRefresh}
          onOpenTab={handleOpenInTab}
          onFullscreen={() => setIsFullscreen(false)}
          onClose={toggleSplitView}
        />
        <div style={{ flex: 1, minHeight: 0 }}>
          <LivePreview
            key={refreshKey}
            content={previewContent}
            language={previewLanguage ?? "html"}
          />
        </div>
      </div>
    );
  }

  // Normal: fill the flex column given by ChatArea
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        minHeight: 0,
        overflow: "hidden",
      }}
    >
      <Toolbar
        isFullscreen={false}
        language={previewLanguage}
        onRefresh={handleRefresh}
        onOpenTab={handleOpenInTab}
        onFullscreen={() => setIsFullscreen(true)}
        onClose={toggleSplitView}
      />

      {/* iframe fills ALL remaining height */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          width: "100%",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <LivePreview
          key={refreshKey}
          content={previewContent}
          language={previewLanguage ?? "html"}
        />
      </div>
    </div>
  );
}

// ── Shared toolbar ────────────────────────────────────────────────────────────

interface ToolbarProps {
  isFullscreen: boolean;
  language: string | null;
  onRefresh: () => void;
  onOpenTab: () => void;
  onFullscreen: () => void;
  onClose: () => void;
}

function Toolbar({
  isFullscreen,
  language,
  onRefresh,
  onOpenTab,
  onFullscreen,
  onClose,
}: ToolbarProps) {
  const { previewMode, setPreviewMode } = useUIStore();

  return (
    <div
      className="flex items-center gap-1 px-2 py-2 border-b border-neutral-200/60 dark:border-dark-border/40 bg-neutral-50 dark:bg-dark-secondary flex-shrink-0"
      style={{ flexShrink: 0 }}
    >
      {/* Language badge */}
      <div className="flex-1 px-2.5 py-1 rounded-md bg-neutral-100 dark:bg-dark-tertiary text-[11px] text-ink-muted dark:text-neutral-600 truncate select-none">
        {language ? `${language.toUpperCase()} Preview` : "Live Preview"}
      </div>

      {/* Dock/Undock Toggle button (visible only on desktop) */}
      <div className="hidden lg:block">
        <Tooltip content={previewMode === "split" ? "Float window" : "Dock to side"}>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setPreviewMode(previewMode === "split" ? "floating" : "split")}
          >
            {previewMode === "split" ? (
              <AppWindow className="size-3.5" />
            ) : (
              <Columns className="size-3.5" />
            )}
          </Button>
        </Tooltip>
      </div>

      <Tooltip content="Refresh">
        <Button variant="ghost" size="xs" onClick={onRefresh}>
          <RefreshCw className="size-3.5" />
        </Button>
      </Tooltip>

      <Tooltip content="Open in new tab">
        <Button variant="ghost" size="xs" onClick={onOpenTab}>
          <ExternalLink className="size-3.5" />
        </Button>
      </Tooltip>

      <Tooltip content={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
        <Button variant="ghost" size="xs" onClick={onFullscreen}>
          {isFullscreen ? (
            <Minimize2 className="size-3.5" />
          ) : (
            <Maximize2 className="size-3.5" />
          )}
        </Button>
      </Tooltip>

      <Tooltip content="Close preview">
        <Button variant="ghost" size="xs" onClick={onClose}>
          <X className="size-3.5" />
        </Button>
      </Tooltip>
    </div>
  );
}
