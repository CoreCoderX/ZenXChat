import { create } from "zustand";
import { ModalType } from "@/types";

interface UIStore {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  activeModal: ModalType;
  modalData: Record<string, unknown>;
  openModal: (type: ModalType, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  isGenerating: boolean;
  setIsGenerating: (generating: boolean) => void;
  abortController: AbortController | null;
  setAbortController: (controller: AbortController | null) => void;
  stopGeneration: () => void;

  splitViewEnabled: boolean;
  toggleSplitView: () => void;

  previewMode: "split" | "floating";
  setPreviewMode: (mode: "split" | "floating") => void;

  // Store both content AND language for the preview
  previewContent: string;
  previewLanguage: string | null;
  setPreviewContent: (content: string, language?: string) => void;

  renamingConversationId: string | null;
  setRenamingConversationId: (id: string | null) => void;
  deletingConversationId: string | null;
  setDeletingConversationId: (id: string | null) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  // ── Sidebar ───────────────────────────────────────────────
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Modal ─────────────────────────────────────────────────
  activeModal: null,
  modalData: {},
  openModal: (type, data = {}) => set({ activeModal: type, modalData: data }),
  closeModal: () => set({ activeModal: null, modalData: {} }),

  // ── Generation ────────────────────────────────────────────
  isGenerating: false,
  abortController: null,
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setAbortController: (controller) => set({ abortController: controller }),
  stopGeneration: () => {
    get().abortController?.abort();
    set({ isGenerating: false, abortController: null });
  },

  // ── Split view ────────────────────────────────────────────
  splitViewEnabled: false,
  toggleSplitView: () =>
    set((s) => ({ splitViewEnabled: !s.splitViewEnabled })),

  previewMode: "split",
  setPreviewMode: (mode) => set({ previewMode: mode }),

  // Preview content + language
  previewContent: "",
  previewLanguage: null,
  setPreviewContent: (content, language) =>
    set({
      previewContent: content,
      previewLanguage: language ?? null,
      // Auto-open the split view when preview is set
      splitViewEnabled: content.length > 0 ? true : get().splitViewEnabled,
    }),

  // ── Rename / Delete ───────────────────────────────────────
  renamingConversationId: null,
  setRenamingConversationId: (id) => set({ renamingConversationId: id }),
  deletingConversationId: null,
  setDeletingConversationId: (id) => set({ deletingConversationId: id }),
}));
