"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { useChat } from "@/hooks/useChat";
import { useCompare } from "@/hooks/useCompare";
import { useCompareStore } from "@/store/compareStore";
import { useMemoryStore } from "@/store/memoryStore";
import { detectMemoryCandidates } from "@/lib/memory";
import { AttachedFile } from "@/types";
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import ChatInput from "./ChatInput";
import CompareView from "@/components/compare/CompareView";
import SplitView from "@/components/preview/SplitView";
import { cn } from "@/lib/utils";
import { motion, useDragControls } from "framer-motion";

export default function ChatArea() {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();
  const [isDraggingPreview, setIsDraggingPreview] = useState(false);
  const [inputHeight, setInputHeight] = useState(120);
  const inputContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = inputContainerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setInputHeight(entry.target.clientHeight);
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const { sendMessage, isGenerating, stopGeneration, editMessage } = useChat();
  const { runCompare, stopCompare, useResult } = useCompare();
  const conversation = useChatStore((s) => s.getActiveConversation());
  const activeConvId = useChatStore((s) => s.activeConversationId);
  const selectedModel = useSettingsStore((s) => s.selectedModel);
  const createConversation = useChatStore((s) => s.createConversation);
  const memoryMode = useSettingsStore((s) => s.memoryMode);
  const addMemory = useMemoryStore((s) => s.addMemory);
  const setPendingCandidates = useMemoryStore((s) => s.setPendingCandidates);
  const setLastSavedNote = useMemoryStore((s) => s.setLastSavedNote);
  const compareRunning = useCompareStore((s) => s.session?.isRunning ?? false);
  const { splitViewEnabled, previewMode, setPreviewMode, compareMode } =
    useUIStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setPreviewMode("floating");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setPreviewMode]);

  const messages = conversation?.messages ?? [];

  // Prompt-driven memory: detect personal details / save keywords after each
  // user message, then either ask for confirmation or save per the setting.
  const handleMemoryDetection = useCallback(
    (text: string, messageId?: string) => {
      if (memoryMode === "off" || !messageId) return;
      const candidates = detectMemoryCandidates(text);
      if (candidates.length === 0) return;

      if (memoryMode === "ask") {
        setPendingCandidates({ messageId, candidates });
      } else {
        // auto — the user opted into silent saving
        let saved = 0;
        for (const c of candidates) {
          if (addMemory(c).ok) saved++;
        }
        setLastSavedNote({ messageId, count: saved });
      }
    },
    [memoryMode, addMemory, setPendingCandidates, setLastSavedNote],
  );

  const handleSend = useCallback(
    async (content: string, attachments?: AttachedFile[], webSearch?: boolean) => {
      const trimmed = content.trim();
      if (!trimmed && (!attachments || attachments.length === 0)) return;
      if (isGenerating || compareRunning) return;

      if (compareMode) {
        await runCompare(trimmed || "Please analyze the attached files.");
        return;
      }

      let convId = activeConvId;
      if (!convId) convId = createConversation(selectedModel);

      const userMsgId = await sendMessage(
        trimmed || "Please analyze the attached files.",
        convId,
        attachments,
      );
      handleMemoryDetection(trimmed, userMsgId ?? undefined);
    },
    [
      isGenerating,
      compareRunning,
      compareMode,
      runCompare,
      activeConvId,
      selectedModel,
      createConversation,
      sendMessage,
      handleMemoryDetection,
    ],
  );

  return (
    // Fill 100% of whatever parent gives us — no intrinsic size
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        overflow: "hidden",
        minHeight: 0,
        minWidth: 0,
        position: "relative",
      }}
    >
      {/* Main body row — chat left, preview right */}
      <div
        style={{
          display: "flex",
          flex: 1,
          minHeight: 0,
          minWidth: 0,
          overflow: "hidden",
          width: "100%",
        }}
      >
        {/* ── Chat column ────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            // When preview is open in split mode, take 50%, else take 100%
            flex: splitViewEnabled && previewMode === "split" ? "0 0 50%" : "1 1 100%",
            minHeight: 0,
            minWidth: 0,
            overflow: "hidden",
            transition: "flex-basis 0.25s ease",
            position: "relative", // Ensures floating children (Header/Input) are bounded
          }}
        >
          {/* Floating Model Header */}
          <ChatHeader />

          {/* Messages / Compare arena — grows to fill space */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              position: "relative",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {compareMode ? (
              <CompareView onUse={useResult} />
            ) : (
              <MessageList
                messages={messages}
                isGenerating={isGenerating}
                onEdit={editMessage}
                bottomPadding={inputHeight}
              />
            )}
          </div>

          {/* Floating Input Container — centered */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none bg-gradient-to-t from-slate-50 via-slate-50/95 to-transparent dark:from-dark dark:via-dark/95 dark:to-transparent pt-16 pb-4 md:pb-6 px-2 md:px-4 flex justify-center z-10">
            <div ref={inputContainerRef} className="w-full md:max-w-3xl pointer-events-auto">
              <ChatInput
                onSend={handleSend}
                isGenerating={compareMode ? compareRunning : isGenerating}
                onStop={compareMode ? stopCompare : stopGeneration}
                placeholder={
                  compareMode ? "Compare both models…" : undefined
                }
              />
            </div>
          </div>
        </div>

        {/* ── Preview column (Split mode card) ───────────────── */}
        {splitViewEnabled && previewMode === "split" && (
          <div
            style={{
              flex: "0 0 50%",
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              margin: "12px 12px 12px 0",
              borderRadius: "24px",
            }}
            className="bg-white dark:bg-dark-secondary shadow-lg border border-neutral-200/60 dark:border-dark-border/40"
          >
            <SplitView />
          </div>
        )}

        {/* ── Floating Preview Window (Floating Mode Overlay) ─────────────────── */}
        {splitViewEnabled && previewMode === "floating" && (
          <motion.div
            drag
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={containerRef}
            dragMomentum={false}
            dragElastic={0}
            onDragStart={() => setIsDraggingPreview(true)}
            onDragEnd={() => setIsDraggingPreview(false)}
            className={cn(
              "absolute z-40 bg-white dark:bg-dark-secondary shadow-2xl flex flex-col overflow-hidden border border-neutral-200/60 dark:border-dark-border/40",
              // On mobile: sits floating as a card inset by 16px (inset-4), not covering full screen
              // On desktop: sits on the right side over the chat view
              "inset-4 md:inset-10 lg:inset-auto lg:top-6 lg:right-6 lg:w-[600px] lg:h-[calc(100%-48px)] rounded-[24px]"
            )}
          >
            {/* Click-through cover shield when actively dragging to prevent iframe stuttering */}
            {isDraggingPreview && (
              <div className="absolute inset-0 z-50 bg-transparent cursor-move" />
            )}

            {/* Draggable Drag-Handle Header */}
            <div
              onPointerDown={(e) => dragControls.start(e)}
              className="flex items-center justify-between px-4 py-2 bg-neutral-100 dark:bg-dark-quaternary border-b border-neutral-200/50 dark:border-dark-border/30 cursor-move text-[10px] font-bold text-ink-muted dark:text-neutral-500 select-none flex-shrink-0"
            >
              <span>DRAG WINDOW TO POSITION</span>
              <div className="flex gap-1">
                <span className="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
                <span className="size-1.5 rounded-full bg-neutral-300 dark:bg-neutral-600" />
              </div>
            </div>

            <SplitView />
          </motion.div>
        )}
      </div>
    </div>
  );
}