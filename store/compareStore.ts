import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CompareHistoryEntry,
  CompareResult,
  CompareSession,
  CompareSide,
} from "@/types";
import { v4 as uuidv4 } from "uuid";

// Keep the newest N comparisons in history (localStorage-friendly)
export const MAX_COMPARE_HISTORY = 10;

/** How the two result cards are laid out in the compare arena. */
export type CompareLayout = "left-right" | "up-down";

function blankResult(model: string): CompareResult {
  return {
    model,
    content: "",
    reasoning: "",
    isStreaming: true,
    isError: false,
    startedAt: Date.now(),
    finishedAt: null,
  };
}

function snapshotResult(r: CompareResult): CompareResult {
  // Normalize a possibly-still-streaming result into a finished snapshot
  return {
    ...r,
    isStreaming: false,
    finishedAt: r.finishedAt ?? Date.now(),
  };
}

interface CompareStore {
  // Picker selection (persisted across sessions)
  pickerModelA: string | null;
  pickerModelB: string | null;
  setPickerModelA: (id: string) => void;
  setPickerModelB: (id: string) => void;
  swapModels: () => void;

  // Arena layout preference (persisted)
  compareLayout: CompareLayout;
  setCompareLayout: (layout: CompareLayout) => void;

  // Active comparison run
  session: CompareSession | null;
  startSession: (prompt: string, modelA: string, modelB: string) => void;
  updateResult: (side: CompareSide, partial: Partial<CompareResult>) => void;
  setRunning: (running: boolean) => void;
  /** Start fresh: archive the current run, abort streams, clear the arena. */
  newChat: () => void;
  clearSession: () => void;

  // History of past comparisons
  history: CompareHistoryEntry[];
  /** Snapshot the current session into history (idempotent, skips empties). */
  archiveCurrentSession: () => void;
  /** Open a past comparison in the arena (read-only snapshot). */
  loadFromHistory: (id: string) => void;
  deleteFromHistory: (id: string) => void;
  clearHistory: () => void;

  // Per-side abort controllers so each card can be stopped independently
  controllers: { a: AbortController | null; b: AbortController | null };
  setController: (side: CompareSide, ctrl: AbortController | null) => void;
}

function abortAll(get: () => CompareStore) {
  get().controllers.a?.abort();
  get().controllers.b?.abort();
}

export const useCompareStore = create<CompareStore>()(
  persist(
    (set, get) => ({
      pickerModelA: null,
      pickerModelB: null,
      setPickerModelA: (id) => set({ pickerModelA: id }),
      setPickerModelB: (id) => set({ pickerModelB: id }),
      swapModels: () =>
        set((s) => ({
          pickerModelA: s.pickerModelB,
          pickerModelB: s.pickerModelA,
        })),

      compareLayout: "left-right",
      setCompareLayout: (layout) => set({ compareLayout: layout }),

      session: null,
      startSession: (prompt, modelA, modelB) => {
        // Archive whatever was in the arena before starting fresh
        get().archiveCurrentSession();
        set({
          session: {
            id: uuidv4(),
            prompt,
            modelA,
            modelB,
            results: { a: blankResult(modelA), b: blankResult(modelB) },
            startedAt: Date.now(),
            isRunning: true,
          },
        });
      },
      updateResult: (side, partial) =>
        set((s) => {
          if (!s.session) return s;
          return {
            session: {
              ...s.session,
              results: {
                ...s.session.results,
                [side]: { ...s.session.results[side], ...partial },
              },
            },
          };
        }),
      setRunning: (running) =>
        set((s) =>
          s.session ? { session: { ...s.session, isRunning: running } } : s,
        ),
      newChat: () => {
        get().archiveCurrentSession();
        abortAll(get);
        set({ session: null, controllers: { a: null, b: null } });
      },
      clearSession: () =>
        set({
          session: null,
          controllers: { a: null, b: null },
        }),

      history: [],
      archiveCurrentSession: () => {
        const s = get().session;
        if (!s || s.archived) return;

        const hasContent =
          s.results.a.content.trim() ||
          s.results.b.content.trim() ||
          s.results.a.reasoning.trim() ||
          s.results.b.reasoning.trim();
        if (!hasContent) return;

        const entry: CompareHistoryEntry = {
          id: s.id,
          prompt: s.prompt,
          modelA: s.modelA,
          modelB: s.modelB,
          results: {
            a: snapshotResult(s.results.a),
            b: snapshotResult(s.results.b),
          },
          startedAt: s.startedAt ?? Date.now(),
          finishedAt:
            s.results.a.finishedAt ?? s.results.b.finishedAt ?? Date.now(),
        };

        set((state) => ({
          history: [entry, ...state.history].slice(0, MAX_COMPARE_HISTORY),
          session: { ...s, archived: true },
        }));
      },
      loadFromHistory: (id) => {
        const entry = get().history.find((h) => h.id === id);
        if (!entry) return;
        get().archiveCurrentSession();
        abortAll(get);
        set({
          controllers: { a: null, b: null },
          // The viewed entry is already in history — mark the copy archived
          // so re-running or exiting doesn't create a duplicate.
          session: {
            id: `view-${entry.id}`,
            prompt: entry.prompt,
            modelA: entry.modelA,
            modelB: entry.modelB,
            results: {
              a: { ...entry.results.a },
              b: { ...entry.results.b },
            },
            startedAt: entry.startedAt,
            isRunning: false,
            archived: true,
          },
          // Point the pickers at the viewed models so a re-run uses them
          pickerModelA: entry.modelA,
          pickerModelB: entry.modelB,
        });
      },
      deleteFromHistory: (id) => {
        set((state) => ({
          history: state.history.filter((h) => h.id !== id),
        }));
      },
      clearHistory: () => set({ history: [] }),

      controllers: { a: null, b: null },
      setController: (side, ctrl) =>
        set((s) => ({ controllers: { ...s.controllers, [side]: ctrl } })),
    }),
    {
      name: "zenxchat-compare-pickers",
      partialize: (state) => ({
        pickerModelA: state.pickerModelA,
        pickerModelB: state.pickerModelB,
        history: state.history,
        compareLayout: state.compareLayout,
      }),
      // Migrate the old three-state layout to the new two-state one:
      // auto / side-by-side become the left-right (swipe) default,
      // stacked becomes up-down.
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<CompareStore>;
        // Legacy persisted values ("auto" / "stacked" / "side-by-side")
        const legacyLayout = p.compareLayout as
          | CompareLayout
          | "auto"
          | "stacked"
          | "side-by-side"
          | undefined;
        return {
          ...current,
          ...p,
          compareLayout:
            legacyLayout === "up-down" || legacyLayout === "stacked"
              ? "up-down"
              : "left-right",
        };
      },
    },
  ),
);
