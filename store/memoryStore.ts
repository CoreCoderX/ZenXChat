import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Memory } from "@/types";
import { v4 as uuidv4 } from "uuid";

// ── Caps — memory is deliberately limited, never unlimited ───────────────────
export const MAX_MEMORIES = 50;
export const MAX_MEMORY_CHARS = 500; // per memory
export const MAX_TOTAL_MEMORY_CHARS = 10_000; // all memories combined

export interface PendingCandidate {
  messageId: string;
  candidates: string[];
}

export interface SavedNote {
  messageId: string;
  count: number;
}

interface MemoryStore {
  memories: Memory[];

  // A detected memory awaiting the user's explicit [Remember] / [Don't save]
  pendingCandidates: PendingCandidate | null;
  // Transient "saved to memory" notice (auto mode) tied to a user message
  lastSavedNote: SavedNote | null;

  addMemory: (text: string) => { ok: boolean; reason?: "full" };
  updateMemory: (id: string, text: string) => void;
  deleteMemory: (id: string) => void;
  toggleMemory: (id: string, enabled: boolean) => void;
  clearAll: () => void;

  setPendingCandidates: (pending: PendingCandidate | null) => void;
  removePendingCandidate: (index: number) => void;
  setLastSavedNote: (note: SavedNote | null) => void;

  getActiveMemories: () => Memory[];
}

function totalChars(memories: Memory[]): number {
  return memories.reduce((sum, m) => sum + m.text.length, 0);
}

export const useMemoryStore = create<MemoryStore>()(
  persist(
    (set, get) => ({
      memories: [],
      pendingCandidates: null,
      lastSavedNote: null,

      addMemory: (rawText) => {
        const text = rawText.trim();
        if (!text) return { ok: false };

        // Dedupe — never store the same fact twice
        const lower = text.toLowerCase();
        if (get().memories.some((m) => m.text.toLowerCase() === lower)) {
          return { ok: true };
        }

        const now = Date.now();
        let memories = [...get().memories];

        // Hard cap on the number of memories — evict oldest first (LRU)
        if (memories.length >= MAX_MEMORIES) {
          const sorted = [...memories].sort((a, b) => a.updatedAt - b.updatedAt);
          const oldestDisabled = sorted.find((m) => !m.enabled);
          const victim = oldestDisabled ?? sorted[0];
          if (victim) {
            memories = memories.filter((m) => m.id !== victim.id);
          }
        }

        memories = [
          ...memories,
          {
            id: uuidv4(),
            text: text.slice(0, MAX_MEMORY_CHARS),
            enabled: true,
            createdAt: now,
            updatedAt: now,
          },
        ];

        // Total-size cap — drop oldest until under the limit
        while (totalChars(memories) > MAX_TOTAL_MEMORY_CHARS && memories.length > 1) {
          const oldest = [...memories].sort((a, b) => a.updatedAt - b.updatedAt)[0];
          memories = memories.filter((m) => m.id !== oldest.id);
        }

        set({ memories });
        return { ok: true };
      },

      updateMemory: (id, rawText) => {
        const text = rawText.trim().slice(0, MAX_MEMORY_CHARS);
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, text, updatedAt: Date.now() } : m,
          ),
        }));
      },

      deleteMemory: (id) => {
        set((state) => ({
          memories: state.memories.filter((m) => m.id !== id),
        }));
      },

      toggleMemory: (id, enabled) => {
        set((state) => ({
          memories: state.memories.map((m) =>
            m.id === id ? { ...m, enabled, updatedAt: Date.now() } : m,
          ),
        }));
      },

      clearAll: () => set({ memories: [] }),

      setPendingCandidates: (pending) => set({ pendingCandidates: pending }),
      removePendingCandidate: (index) => {
        const pending = get().pendingCandidates;
        if (!pending) return;
        const candidates = pending.candidates.filter((_, i) => i !== index);
        set({
          pendingCandidates:
            candidates.length > 0 ? { ...pending, candidates } : null,
        });
      },
      setLastSavedNote: (note) => set({ lastSavedNote: note }),

      getActiveMemories: () =>
        [...get().memories]
          .filter((m) => m.enabled)
          .sort((a, b) => b.updatedAt - a.updatedAt),
    }),
    {
      name: "zenxchat-memories",
      partialize: (state) => ({
        memories: state.memories,
      }),
    },
  ),
);
