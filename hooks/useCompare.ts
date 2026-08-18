"use client";

import { useCallback, useEffect, useRef } from "react";
import { useCompareStore } from "@/store/compareStore";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { useMemoryStore } from "@/store/memoryStore";
import { streamChatDirect } from "@/lib/openrouter-client";
import { friendlyErrorMessage } from "@/lib/errors";
import { buildMemoryContextMessage } from "@/lib/memory";
import { ChatMessage, CompareSide, GenerationParams } from "@/types";

// Fallback second model when the picker has nothing selected yet
const DEFAULT_COMPARE_B = "google/gemini-2.0-flash-001";

function buildCompareMessages(prompt: string): ChatMessage[] {
  const messages: ChatMessage[] = [];

  const sysPrompt = useSettingsStore.getState().systemPrompt?.trim();
  if (sysPrompt) messages.push({ role: "system", content: sysPrompt });

  if (useSettingsStore.getState().codeMode) {
    messages.push({
      role: "system",
      content:
        "You are a code-focused assistant. Respond with clean, well-commented code in fenced markdown code blocks.",
    });
  }

  const memoryMsg = buildMemoryContextMessage(
    useMemoryStore.getState().getActiveMemories(),
  );
  if (memoryMsg) messages.push({ role: "system", content: memoryMsg });

  messages.push({ role: "user", content: prompt });
  return messages;
}

type RunOneStreamFn = (
  side: CompareSide,
  model: string,
  messages: ChatMessage[],
  controller: AbortController,
  keyValue: string,
) => Promise<void>;

export function useCompare() {
  const uiStore = useUIStore();
  const runStreamRef = useRef<RunOneStreamFn | null>(null);

  // ── One side of the comparison ───────────────────────────────────────────
  const runOneStream = useCallback<RunOneStreamFn>(
    async (side, model, messages, controller, keyValue) => {
      let textBuffer = "";
      let reasoningBuffer = "";
      let reasoningFull = "";
      let isStreamActive = true;
      let reasoningStartedAt: number | null = null;

      const flushInterval = setInterval(() => {
        if (!isStreamActive) return;
        if (textBuffer.length === 0 && reasoningBuffer.length === 0) return;

        if (reasoningBuffer.length > 0) {
          const take = Math.max(1, Math.ceil(reasoningBuffer.length / 2));
          const chunk = reasoningBuffer.slice(0, take);
          reasoningBuffer = reasoningBuffer.slice(take);
          if (!reasoningStartedAt) reasoningStartedAt = Date.now();
          const cur =
            useCompareStore.getState().session?.results[side].reasoning ?? "";
          useCompareStore
            .getState()
            .updateResult(side, { reasoning: cur + chunk });
        }

        let charsToConsume = 1;
        const len = textBuffer.length;
        if (len > 150) charsToConsume = Math.ceil(len / 10);
        else if (len > 80) charsToConsume = 8;
        else if (len > 30) charsToConsume = 4;
        else if (len > 10) charsToConsume = 2;

        const chunk = textBuffer.slice(0, charsToConsume);
        textBuffer = textBuffer.slice(charsToConsume);
        const cur = useCompareStore.getState().session?.results[side].content ?? "";
        useCompareStore.getState().updateResult(side, { content: cur + chunk });
      }, 16);

      const cleanup = () => {
        clearInterval(flushInterval);
        isStreamActive = false;
      };

      const maybeFinish = () => {
        const session = useCompareStore.getState().session;
        if (
          session &&
          !session.results.a.isStreaming &&
          !session.results.b.isStreaming
        ) {
          useCompareStore.getState().setRunning(false);
        }
      };

      await streamChatDirect({
        model,
        messages,
        apiKey: keyValue,
        signal: controller.signal,
        generationParams: (() => {
          const s = useSettingsStore.getState();
          const p: GenerationParams = {
            temperature: s.temperature,
            topP: s.topP,
            topK: s.topK,
            maxTokens: s.maxTokens,
            presencePenalty: s.presencePenalty,
            frequencyPenalty: s.frequencyPenalty,
          };
          return p;
        })(),

        onChunk: (chunk) => {
          textBuffer += chunk;
        },

        onReasoning: (chunk) => {
          reasoningBuffer += chunk;
          reasoningFull += chunk;
          if (!reasoningStartedAt) reasoningStartedAt = Date.now();
        },

        onComplete: (fullText) => {
          cleanup();
          useCompareStore.getState().updateResult(side, {
            content: fullText,
            reasoning: reasoningFull,
            reasoningDuration: reasoningStartedAt
              ? (Date.now() - reasoningStartedAt) / 1000
              : undefined,
            isStreaming: false,
            finishedAt: Date.now(),
          });
          useCompareStore.getState().setController(side, null);
          maybeFinish();
        },

        onError: (err) => {
          cleanup();
          const { friendly, detail } = friendlyErrorMessage(err, model);
          useCompareStore.getState().updateResult(side, {
            content: friendly,
            errorDetail: detail,
            isError: true,
            isStreaming: false,
            finishedAt: Date.now(),
          });
          useCompareStore.getState().setController(side, null);
          maybeFinish();
        },
      });
    },
    [],
  );

  useEffect(() => {
    runStreamRef.current = runOneStream;
  }, [runOneStream]);

  // ── Kick off both models at once ─────────────────────────────────────────
  const runCompare = useCallback(async (prompt: string) => {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const compare = useCompareStore.getState();
    const modelA =
      compare.pickerModelA ?? useSettingsStore.getState().selectedModel;
    const modelB =
      compare.pickerModelB ??
      (modelA === DEFAULT_COMPARE_B
        ? useSettingsStore.getState().selectedModel
        : DEFAULT_COMPARE_B);

    const activeKey = useSettingsStore.getState().apiKeys.find(
      (k) => k.id === useSettingsStore.getState().activeKeyId,
    );

    compare.startSession(trimmed, modelA, modelB);

    if (!activeKey?.key) {
      const msg =
        "⚠️ **No API key configured.**\n\nGo to **Settings → API Keys** and add your [OpenRouter API key](https://openrouter.ai/keys).";
      compare.updateResult("a", {
        content: msg,
        isError: true,
        isStreaming: false,
        finishedAt: Date.now(),
      });
      compare.updateResult("b", {
        content: msg,
        isError: true,
        isStreaming: false,
        finishedAt: Date.now(),
      });
      compare.setRunning(false);
      return;
    }

    const messages = buildCompareMessages(trimmed);

    const controllerA = new AbortController();
    const controllerB = new AbortController();
    compare.setController("a", controllerA);
    compare.setController("b", controllerB);
    compare.setRunning(true);

    await Promise.all([
      runStreamRef.current?.("a", modelA, messages, controllerA, activeKey.key),
      runStreamRef.current?.("b", modelB, messages, controllerB, activeKey.key),
    ]);
  }, []);

  // ── Stop both sides ──────────────────────────────────────────────────────
  const stopCompare = useCallback(() => {
    const compare = useCompareStore.getState();
    compare.controllers.a?.abort();
    compare.controllers.b?.abort();
    const session = compare.session;
    if (session) {
      for (const side of ["a", "b"] as const) {
        if (session.results[side].isStreaming) {
          compare.updateResult(side, {
            isStreaming: false,
            finishedAt: Date.now(),
          });
        }
      }
      compare.setRunning(false);
    }
    compare.setController("a", null);
    compare.setController("b", null);
  }, []);

  // ── Adopt one side's answer into the active conversation ─────────────────
  const useResult = useCallback((side: CompareSide) => {
    const session = useCompareStore.getState().session;
    if (!session) return;
    const result = session.results[side];
    if (!result.content.trim() || result.isStreaming || result.isError) return;

    const chatStore = useChatStore.getState();
    let convId = chatStore.activeConversationId;
    if (!convId) convId = chatStore.createConversation(result.model);

    const conv = chatStore.getConversation(convId);
    if (!conv) return;

    const last = conv.messages[conv.messages.length - 1];
    if (!last || last.role !== "user" || last.content !== session.prompt) {
      chatStore.addMessage(convId, { role: "user", content: session.prompt });
    }
    chatStore.addMessage(convId, {
      role: "assistant",
      content: result.content,
      model: result.model,
      reasoning: result.reasoning || undefined,
      reasoningDuration: result.reasoningDuration,
    });
    chatStore.selectConversation(convId);
    uiStore.setCompareMode(false);
  }, [uiStore]);

  // Abort anything still running if the hook unmounts
  useEffect(() => {
    return () => {
      const compare = useCompareStore.getState();
      compare.controllers.a?.abort();
      compare.controllers.b?.abort();
    };
  }, []);

  return { runCompare, stopCompare, useResult };
}
