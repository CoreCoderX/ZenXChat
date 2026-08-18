import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, Message } from "@/types";
import { v4 as uuidv4 } from "uuid";

// Auto-generate a title from the first user message
function generateTitle(content: string): string {
  const cleaned = content.trim().replace(/\n+/g, " ");
  return cleaned.length > 40 ? cleaned.slice(0, 40) + "..." : cleaned;
}

interface ChatStore {
  conversations: Conversation[];
  activeConversationId: string | null;

  // Getters
  getActiveConversation: () => Conversation | null;
  getConversation: (id: string) => Conversation | null;

  // Conversation actions
  createConversation: (model?: string, systemPrompt?: string) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  duplicateConversation: (id: string) => string;
  clearAllConversations: () => void;

  // Message actions
  addMessage: (
    conversationId: string,
    message: Omit<Message, "id" | "timestamp">,
  ) => string;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updates: Partial<Message>,
  ) => void;
  deleteMessage: (conversationId: string, messageId: string) => void;
  truncateMessagesAfter: (conversationId: string, messageId: string) => void;
  setMessageStreaming: (
    conversationId: string,
    messageId: string,
    isStreaming: boolean,
  ) => void;
  appendToMessage: (
    conversationId: string,
    messageId: string,
    chunk: string,
  ) => void;
  appendReasoningToMessage: (
    conversationId: string,
    messageId: string,
    chunk: string,
  ) => void;

  // Conversation settings
  setConversationModel: (id: string, model: string) => void;
  setConversationSystemPrompt: (id: string, prompt: string) => void;
  setConversationCodeMode: (id: string, codeMode: boolean) => void;
}

export const useChatStore = create<ChatStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,

      // ── Getters ──────────────────────────────────────────────

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) ?? null;
      },

      getConversation: (id: string) => {
        return get().conversations.find((c) => c.id === id) ?? null;
      },

      // ── Conversation Actions ─────────────────────────────────

      createConversation: (
        model = "meta-llama/llama-3.1-8b-instruct:free",
        systemPrompt = "",
      ) => {
        const id = uuidv4();
        const now = Date.now();

        const newConversation: Conversation = {
          id,
          title: "New Chat",
          messages: [],
          createdAt: now,
          updatedAt: now,
          model,
          systemPrompt,
          isCodeMode: false,
        };

        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          activeConversationId: id,
        }));

        return id;
      },

      selectConversation: (id: string) => {
        set({ activeConversationId: id });
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const filtered = state.conversations.filter((c) => c.id !== id);
          // If deleting active, switch to next conversation
          const newActiveId =
            state.activeConversationId === id
              ? (filtered[0]?.id ?? null)
              : state.activeConversationId;

          return {
            conversations: filtered,
            activeConversationId: newActiveId,
          };
        });
      },

      renameConversation: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? {
                  ...c,
                  title: title.trim() || "Untitled",
                  updatedAt: Date.now(),
                }
              : c,
          ),
        }));
      },

      duplicateConversation: (id: string) => {
        const original = get().getConversation(id);
        if (!original) return id;

        const newId = uuidv4();
        const now = Date.now();

        const duplicate: Conversation = {
          ...original,
          id: newId,
          title: `${original.title} (copy)`,
          createdAt: now,
          updatedAt: now,
          // Deep copy messages with new IDs
          messages: original.messages.map((m) => ({ ...m, id: uuidv4() })),
        };

        set((state) => ({
          conversations: [duplicate, ...state.conversations],
          activeConversationId: newId,
        }));

        return newId;
      },

      clearAllConversations: () => {
        set({ conversations: [], activeConversationId: null });
      },

      // ── Message Actions ──────────────────────────────────────

      addMessage: (
        conversationId: string,
        message: Omit<Message, "id" | "timestamp">,
      ) => {
        const messageId = uuidv4();
        const now = Date.now();

        const fullMessage: Message = {
          ...message,
          id: messageId,
          timestamp: now,
        };

        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;

            // Auto-title from first user message
            const isFirstUserMessage =
              message.role === "user" && c.messages.length === 0;

            return {
              ...c,
              messages: [...c.messages, fullMessage],
              updatedAt: now,
              title: isFirstUserMessage
                ? generateTitle(message.content)
                : c.title,
            };
          }),
        }));

        return messageId;
      },

      updateMessage: (
        conversationId: string,
        messageId: string,
        updates: Partial<Message>,
      ) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m,
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      deleteMessage: (conversationId: string, messageId: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.filter((m) => m.id !== messageId),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      truncateMessagesAfter: (conversationId: string, messageId: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const idx = c.messages.findIndex((m) => m.id === messageId);
            if (idx === -1) return c;
            return {
              ...c,
              messages: c.messages.slice(0, idx + 1),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      setMessageStreaming: (
        conversationId: string,
        messageId: string,
        isStreaming: boolean,
      ) => {
        get().updateMessage(conversationId, messageId, { isStreaming });
      },

      // Append a chunk of text to a message (for streaming)
      appendToMessage: (
        conversationId: string,
        messageId: string,
        chunk: string,
      ) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + chunk } : m,
              ),
            };
          }),
        }));
      },

      // Append a chunk to a message's reasoning trace (for streaming)
      appendReasoningToMessage: (
        conversationId: string,
        messageId: string,
        chunk: string,
      ) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId
                  ? { ...m, reasoning: (m.reasoning ?? "") + chunk }
                  : m,
              ),
            };
          }),
        }));
      },

      // ── Conversation Settings ─────────────────────────────────

      setConversationModel: (id: string, model: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, model, updatedAt: Date.now() } : c,
          ),
        }));
      },

      setConversationSystemPrompt: (id: string, prompt: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? { ...c, systemPrompt: prompt, updatedAt: Date.now() }
              : c,
          ),
        }));
      },

      setConversationCodeMode: (id: string, codeMode: boolean) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id
              ? { ...c, isCodeMode: codeMode, updatedAt: Date.now() }
              : c,
          ),
        }));
      },
    }),
    {
      name: "zenxchat-chats",
      // Limit stored messages to avoid localStorage overflow
      partialize: (state) => ({
        conversations: state.conversations.map((c) => ({
          ...c,
          // Keep max 100 messages per conversation in storage
          messages: c.messages.slice(-100),
        })),
        activeConversationId: state.activeConversationId,
      }),
    },
  ),
);
