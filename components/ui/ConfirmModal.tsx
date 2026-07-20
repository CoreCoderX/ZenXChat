"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUIStore } from "@/store/uiStore";
import Button from "@/components/ui/Button";
import { AlertTriangle, Info } from "lucide-react";

export default function ConfirmModal() {
  const { activeModal, closeModal, modalData } = useUIStore();

  const isOpen = activeModal === "delete" || activeModal === "confirm";

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  if (!isOpen) return null;

  const title = (modalData?.title as string) || "Are you sure?";
  const message = (modalData?.message as string) || "This action cannot be undone.";
  const confirmText = (modalData?.confirmText as string) || "Confirm";
  const cancelText = (modalData?.cancelText as string) || "Cancel";
  const onConfirm = modalData?.onConfirm as (() => void) | undefined;
  const isDestructive = activeModal === "delete" || modalData?.isDestructive === true;

  // Handle confirmation click
  const handleConfirm = () => {
    if (onConfirm) onConfirm();
    closeModal();
  };

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-[110] flex items-center justify-center p-4"
        style={{ isolation: "isolate" }}
      >
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 bg-black/60 dark:bg-black/85 backdrop-blur-[2px]"
          onClick={closeModal}
        />

        {/* Modal dialog box */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative z-10 w-full max-w-[380px] overflow-hidden rounded-2xl border border-neutral-200 dark:border-dark-border bg-white dark:bg-dark-secondary p-5 shadow-2xl"
        >
          {/* Header icon + text */}
          <div className="flex gap-3.5 items-start">
            <div className={`p-2 rounded-xl flex-shrink-0 flex items-center justify-center ${
              isDestructive
                ? "bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400"
                : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 dark:text-emerald-400"
            }`}>
              {isDestructive ? <AlertTriangle className="size-5" /> : <Info className="size-5" />}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-semibold text-ink dark:text-neutral-100 leading-normal">
                {title}
              </h3>
              <p className="text-xs text-ink-muted dark:text-neutral-500 mt-1.5 leading-relaxed">
                {message}
              </p>
            </div>
          </div>

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-2 mt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={closeModal}
              className="text-xs font-medium text-ink-secondary dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-dark-tertiary px-4"
            >
              {cancelText}
            </Button>
            <Button
              variant={isDestructive ? "default" : "default"}
              size="sm"
              onClick={handleConfirm}
              className={`text-xs font-semibold px-4 py-2 text-white border-0 transition-colors ${
                isDestructive
                  ? "bg-red-500 hover:bg-red-600 active:bg-red-700"
                  : "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700"
              }`}
            >
              {confirmText}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
