"use client";

import { useCallback, useEffect, useRef } from "react";
import { useChatStore } from "@/store/chatStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useUIStore } from "@/store/uiStore";
import { streamChatDirect } from "@/lib/openrouter-client";
import { AttachedFile, ChatMessage } from "@/types";

export function useChat() {
const uiStore = useUIStore();

// ── Build message array ───────────────────────────────────────────────────

const buildMessages = useCallback(
(
conversationId: string,
newUserContent: string,
attachments?: AttachedFile[],
): ChatMessage[] => {
const conv = useChatStore.getState().getConversation(conversationId);
const result: ChatMessage[] = [];


  const sysPrompt =
    conv?.systemPrompt?.trim() || useSettingsStore.getState().systemPrompt?.trim();
  if (sysPrompt) result.push({ role: "system", content: sysPrompt });

  if (conv?.isCodeMode ?? useSettingsStore.getState().codeMode) {
    result.push({
      role: "system",
      content:
        "You are a code-focused assistant. Respond with clean, well-commented code in fenced markdown code blocks.",
    });
  }

  // History
  if (conv) {
    conv.messages
      .filter(
        (m) =>
          !m.isStreaming &&
          !m.isError &&
          m.content.trim() &&
          (m.role === "user" || m.role === "assistant"),
      )
      .slice(-20)
      .forEach((m) => result.push({ role: m.role, content: m.content }));
  }

  // Build the user message with image attachments
  const imageAttachments =
    attachments?.filter((f) => f.type.startsWith("image/")) ?? [];

  if (imageAttachments.length > 0) {
    // Multi-modal message format for vision models
    result.push({
      role: "user",
      content: [
        { type: "text", text: newUserContent || "Analyze these images." },
        ...imageAttachments.map((img) => ({
          type: "image_url",
          image_url: { url: img.content },
        })),
      ] as unknown as string,
    });
  } else if (newUserContent) {
    // Only append when there's actual content — when empty, the conversation
    // history already ends with the user message (edit-resend path).
    const last = result[result.length - 1];
    if (!last || last.role !== "user" || last.content !== newUserContent) {
      result.push({ role: "user", content: newUserContent });
    }
  }

  return result;
},
[],
);

// ── Stream runner ─────────────────────────────────────────────────────────

const runStreamRef = useRef<any>(null);

  const runStream = useCallback(
    async (
      convId: string,
      assistantMsgId: string,
      model: string,
      messages: ChatMessage[],
      controller: AbortController,
      keyId: string,
      keyValue: string,
      providerOrder?: string[],
    ) => {
      // Typewriter buffer state variables
      let textBuffer = "";
      let isStreamActive = true;

      const flushInterval = setInterval(() => {
        if (!isStreamActive) return;
        if (textBuffer.length === 0) return;

        // Consume characters dynamically based on buffer depth to keep up with fast models
        let charsToConsume = 1;
        const len = textBuffer.length;
        if (len > 150) {
          charsToConsume = Math.ceil(len / 10);
        } else if (len > 80) {
          charsToConsume = 8;
        } else if (len > 30) {
          charsToConsume = 4;
        } else if (len > 10) {
          charsToConsume = 2;
        }

        const chunk = textBuffer.slice(0, charsToConsume);
        textBuffer = textBuffer.slice(charsToConsume);
        useChatStore.getState().appendToMessage(convId, assistantMsgId, chunk);
      }, 16);

      const cleanupInterval = () => {
        clearInterval(flushInterval);
        isStreamActive = false;
      };

      await streamChatDirect({
        model,
        messages,
        apiKey: keyValue,
        signal: controller.signal,

        onChunk: (chunk) => {
          textBuffer += chunk;
        },

        onComplete: (fullText) => {
          cleanupInterval();
          const stored =
            useChatStore.getState()
              .getConversation(convId)
              ?.messages.find((m) => m.id === assistantMsgId)?.content ?? "";
          useChatStore.getState().updateMessage(convId, assistantMsgId, {
            content: fullText || stored,
            isStreaming: false,
            isError: false,
          });
          uiStore.setIsGenerating(false);
          uiStore.setAbortController(null);
          useSettingsStore.getState().updateKeyStatus(keyId, "valid");
        },

    onError: async (err, availableProviders) => {
      cleanupInterval();
      console.error(
        "[runStream] Error:",
        err.message,
        "providers:",
        availableProviders,
      );

      // Auto-retry with available providers
      if (
        !providerOrder &&
        availableProviders &&
        availableProviders.length > 0
      ) {
        await runStreamRef.current(
          convId,
          assistantMsgId,
          model,
          messages,
          controller,
          keyId,
          keyValue,
          availableProviders,
        );
        return;
      }

      // Try fallback key
      const fallback = useSettingsStore.getState().getNextFallbackKey(keyId);
      if (fallback && !providerOrder) {
        useSettingsStore.getState().updateKeyStatus(keyId, "invalid");
        useSettingsStore.getState().setActiveKey(fallback.id);
        await runStreamRef.current(
          convId,
          assistantMsgId,
          model,
          messages,
          controller,
          fallback.id,
          fallback.key,
        );
        return;
      }

      useChatStore.getState().updateMessage(convId, assistantMsgId, {
        content:
          `❌ **${err.message}**\n\n` +
          `**Model:** \`${model}\`\n\n` +
          `Please select a different model or check your API key in **Settings → API Keys**.`,
        isStreaming: false,
        isError: true,
      });
      uiStore.setIsGenerating(false);
      uiStore.setAbortController(null);
    },
  });
},
[uiStore],
);

useEffect(() => {
runStreamRef.current = runStream;
}, [runStream]);

// ── Send message ──────────────────────────────────────────────────────────

const sendMessage = useCallback(
async (
content: string,
conversationId?: string,
attachments?: AttachedFile[],
) => {
const trimmed = content.trim();
if (!trimmed && (!attachments || attachments.length === 0)) return;

  let convId = conversationId ?? useChatStore.getState().activeConversationId;
  if (!convId)
    convId = useChatStore.getState().createConversation(useSettingsStore.getState().selectedModel);

  const conv = useChatStore.getState().getConversation(convId);
  const model = conv?.model ?? useSettingsStore.getState().selectedModel;

  const activeKey = useSettingsStore.getState().apiKeys.find(
    (k) => k.id === useSettingsStore.getState().activeKeyId,
  );
  if (!activeKey?.key) {
    useChatStore.getState().addMessage(convId, {
      role: "assistant",
      content:
        "⚠️ **No API key configured.**\n\nGo to **Settings → API Keys** and add your [OpenRouter API key](https://openrouter.ai/keys).",
      isError: true,
    });
    return;
  }

  // Add user message
  useChatStore.getState().addMessage(convId, {
    role: "user",
    content: trimmed || "Analyze the attached files.",
    attachments,
  });

  const messages = buildMessages(convId, trimmed, attachments);

  const assistantMsgId = useChatStore.getState().addMessage(convId, {
    role: "assistant",
    content: "",
    isStreaming: true,
    model,
  });

  const controller = new AbortController();
  uiStore.setAbortController(controller);
  uiStore.setIsGenerating(true);

  await runStream(
    convId,
    assistantMsgId,
    model,
    messages,
    controller,
    activeKey.id,
    activeKey.key,
  );
},
[uiStore, buildMessages, runStream],
);

// ── Regenerate ────────────────────────────────────────────────────────────

const regenerateLastMessage = useCallback(async () => {
const convId = useChatStore.getState().activeConversationId;
if (!convId) return;


const conv = useChatStore.getState().getConversation(convId);
if (!conv || conv.messages.length < 2) return;

const model = conv.model ?? useSettingsStore.getState().selectedModel;
const msgs = conv.messages;

const lastAsstIdx = [...msgs]
  .reverse()
  .findIndex((m) => m.role === "assistant");
if (lastAsstIdx === -1) return;

const lastAsst = msgs[msgs.length - 1 - lastAsstIdx];
const historyMsgs: ChatMessage[] = [];

const sysPrompt =
  conv.systemPrompt?.trim() || useSettingsStore.getState().systemPrompt?.trim();
if (sysPrompt) historyMsgs.push({ role: "system", content: sysPrompt });

msgs
  .filter(
    (m) =>
      m.id !== lastAsst.id &&
      !m.isStreaming &&
      !m.isError &&
      m.content.trim() &&
      (m.role === "user" || m.role === "assistant"),
  )
  .slice(-20)
  .forEach((m) => historyMsgs.push({ role: m.role, content: m.content }));

if (historyMsgs.length === 0) return;

const activeKey = useSettingsStore.getState().apiKeys.find(
  (k) => k.id === useSettingsStore.getState().activeKeyId,
);
if (!activeKey?.key) return;

useChatStore.getState().updateMessage(convId, lastAsst.id, {
  content: "",
  isStreaming: true,
  isError: false,
});

const controller = new AbortController();
uiStore.setAbortController(controller);
uiStore.setIsGenerating(true);

await runStream(
  convId,
  lastAsst.id,
  model,
  historyMsgs,
  controller,
  activeKey.id,
  activeKey.key,
);
}, [uiStore, runStream]);

const editMessage = useCallback(
async (messageId: string, newContent: string) => {
const convId = useChatStore.getState().activeConversationId;
if (!convId) return;

  const conv = useChatStore.getState().getConversation(convId);
  if (!conv) return;

  // 1. Update the edited user message in place
  useChatStore.getState().updateMessage(convId, messageId, { content: newContent });

  // 2. Remove all messages AFTER the edited one (so history ends with the edited user msg)
  useChatStore.getState().truncateMessagesAfter(convId, messageId);

  // 3. Get the fresh conversation (now ending at the edited user message)
  const updatedConv = useChatStore.getState().getConversation(convId);
  if (!updatedConv) return;

  const model = updatedConv.model ?? useSettingsStore.getState().selectedModel;

  const activeKey = useSettingsStore.getState().apiKeys.find(
    (k) => k.id === useSettingsStore.getState().activeKeyId,
  );
  if (!activeKey?.key) {
    useChatStore.getState().addMessage(convId, {
      role: "assistant",
      content:
        "⚠️ **No API key configured.**\n\nGo to **Settings → API Keys** and add your [OpenRouter API key](https://openrouter.ai/keys).",
      isError: true,
    });
    return;
  }

  // 4. Build messages from the stored history.
  //    Pass "" as newUserContent — the edited message is already the last item
  //    in the conversation history, so buildMessages will include it from history
  //    and the dedup guard won't push a duplicate.
  const messages = buildMessages(convId, "");

  // 5. Add a new streaming assistant message
  const assistantMsgId = useChatStore.getState().addMessage(convId, {
    role: "assistant",
    content: "",
    isStreaming: true,
    model,
  });

  const controller = new AbortController();
  uiStore.setAbortController(controller);
  uiStore.setIsGenerating(true);

  await runStream(
    convId,
    assistantMsgId,
    model,
    messages,
    controller,
    activeKey.id,
    activeKey.key,
  );
},
[uiStore, buildMessages, runStream],
);

return {
sendMessage,
regenerateLastMessage,
editMessage,
isGenerating: uiStore.isGenerating,
stopGeneration: uiStore.stopGeneration,
};
}