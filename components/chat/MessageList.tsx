"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { Message } from "@/types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import WelcomeScreen from "./WelcomeScreen";
import { useChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface MessageListProps {
  messages: Message[];
  isGenerating: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  bottomPadding?: number;
}

export default function MessageList({
  messages,
  isGenerating,
  onEdit,
  bottomPadding,
}: MessageListProps) {
  const { regenerateLastMessage } = useChat();
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);
  const [showBtn, setShowBtn] = useState(false);

  // Track whether the user has manually scrolled up during streaming.
  // When true, auto-scroll is suppressed until they scroll back down.
  const userScrolledUpRef = useRef(false);

  const isNearBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight <= 120;
  }, []);

  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollRef.current;
    if (!el) return;
    userScrolledUpRef.current = false; // Re-lock auto-scroll
    if (instant) {
      el.scrollTop = el.scrollHeight;
    } else {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, []);

  const lastMessageContent =
    messages.length > 0 ? messages[messages.length - 1]?.content : "";

  // Detect user intentionally scrolling up — pauses auto-scroll during generation.
  // Resets when they scroll back to the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Desktop: wheel event (deltaY < 0 = scrolling UP)
    const onWheel = (e: WheelEvent) => {
      if (isGenerating && e.deltaY < 0) {
        userScrolledUpRef.current = true;
      }
    };

    // Mobile: touchmove (swipe) anywhere on the scroll area during generation
    const onTouchMove = () => {
      if (isGenerating) {
        userScrolledUpRef.current = true;
      }
    };

    // When they scroll back to bottom, re-enable auto-scroll
    const onScroll = () => {
      const near = isNearBottom();
      setShowBtn(!near);
      if (near) {
        userScrolledUpRef.current = false;
      }
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("scroll", onScroll);
    };
  }, [isGenerating, isNearBottom]);

  // Auto-scroll when messages are updated or streaming
  useEffect(() => {
    const count = messages.length;
    if (count === 0) return;

    const last = messages[count - 1];

    // Always snap to bottom instantly when user sends a message
    if (count > prevCountRef.current && last?.role === "user") {
      userScrolledUpRef.current = false; // New message resets pause flag
      scrollToBottom(true);
      prevCountRef.current = count;
      return;
    }

    prevCountRef.current = count;

    // Smooth auto-scroll during streaming.
    // IMPORTANT: check userScrolledUpRef INSIDE the timeout callback, not here.
    // This gives wheel/touch events the full 50ms window to set the pause flag
    // before the scroll actually fires — preventing the "can't scroll up" race.
    if (isNearBottom()) {
      const timerId = setTimeout(() => {
        if (!userScrolledUpRef.current) {
          scrollToBottom(false);
        }
      }, 50);
      // Cancel this timer if the effect re-fires (new chunk arrived) before it ran
      return () => clearTimeout(timerId);
    }
  }, [messages, lastMessageContent, isGenerating, scrollToBottom, isNearBottom]);

  // (scroll show/hide and userScrolledUp detection handled in the combined effect above)

  // Initial scroll
  useEffect(() => {
    scrollToBottom(true);
  }, []); // eslint-disable-line

  if (messages.length === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <WelcomeScreen />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div
        ref={scrollRef}
        className="h-full w-full"
        style={
          {
            overflowY: "auto",
            overflowX: "hidden",
            overflowAnchor: "none",   // Prevent scroll-jump when new content appends
            WebkitOverflowScrolling: "touch", // Momentum scroll on iOS Safari
            // willChange hints the browser to put this on its own compositing layer —
            // keeps touch scrolling buttery-smooth even during rapid React re-renders.
            willChange: "scroll-position",
            isolation: "isolate",
          } as React.CSSProperties
        }
      >
        <div className="min-h-full flex flex-col justify-end">
          <div
            className="w-full md:mx-auto md:max-w-3xl px-3 md:px-4 pt-16"
            style={{ paddingBottom: bottomPadding ? `${bottomPadding + 56}px` : "140px" }}
          >
            {messages.map((message, index) => {
              const isLast = index === messages.length - 1;
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  isLast={isLast}
                  onRegenerate={
                    isLast && message.role === "assistant"
                      ? regenerateLastMessage
                      : undefined
                  }
                  isGenerating={isGenerating}
                  onEdit={onEdit}
                />
              );
            })}

            {isGenerating && messages[messages.length - 1]?.role === "user" && (
              <TypingIndicator />
            )}

            <div className="h-4" aria-hidden />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => scrollToBottom(false)}
            style={{ bottom: bottomPadding ? `${bottomPadding + 44}px` : "140px" }}
            className={cn(
              "absolute left-1/2 -translate-x-1/2 z-20",
              "size-9 flex items-center justify-center rounded-full",
              "bg-white dark:bg-neutral-800",
              "text-neutral-700 dark:text-neutral-200",
              "shadow-lg border border-neutral-200 dark:border-neutral-700",
              "hover:bg-neutral-50 dark:hover:bg-neutral-700",
              "active:scale-90 transition-all duration-150",
            )}
            aria-label="Scroll to latest"
          >
            <ArrowDown className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
