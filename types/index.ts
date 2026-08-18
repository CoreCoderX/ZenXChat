// ============================================================
// Core Type Definitions for OpenRouter Chat
// ============================================================

// --- Message Types ---

export type MessageRole = "user" | "assistant" | "system";

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  model?: string; // Which model generated this response
  isStreaming?: boolean; // Currently being streamed
  isError?: boolean; // Error state
  reasoning?: string; // Model's reasoning / thinking trace (delta.reasoning)
  reasoningDuration?: number; // Seconds spent producing the reasoning trace
  tokenCount?: number; // Optional token usage
  errorDetail?: string; // Full raw error info behind the "!" in the error bubble
  attachments?: AttachedFile[];
  searchResults?: WebSearchResult[];
}

// --- Conversation Types ---

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
  model: string; // Model used for this conversation
  systemPrompt?: string; // Per-conversation system prompt
  isCodeMode?: boolean; // Code mode enabled
}

// --- OpenRouter Model Types ---

export type ModelModality = "text" | "image" | "audio" | "file";

export interface ModelPricing {
  prompt: string; // Cost per prompt token (USD)
  completion: string; // Cost per completion token (USD)
  image?: string; // Cost per image (if applicable)
}

export interface ModelCapabilities {
  supportsStreaming: boolean;
  supportsSystemPrompt: boolean;
  supportsImages: boolean;
  supportsWebSearch: boolean;
  supportsVoice: boolean;
  maxContextLength: number;
}

export interface OpenRouterModel {
  id: string; // e.g. "anthropic/claude-3-5-sonnet"
  name: string; // Display name
  description?: string;
  context_length: number;
  pricing: ModelPricing;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
  };
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  /** Params the model officially supports, e.g. ["temperature","top_p","tools","reasoning",...] */
  supported_parameters?: string[];
  // Derived / enriched fields
  provider: string; // "anthropic", "openai", etc.
  isFree: boolean;
  isPopular: boolean;
  category: ModelCategory[];
  // Capability flags derived from the Models API metadata
  supportsReasoning: boolean;
  supportsTools: boolean;
  supportsStructuredOutputs: boolean;
  supportsVision: boolean;
  isLongContext: boolean;
}

// --- Model Category / Filter Types ---

export type ModelCategory =
  | "all"
  | "free"
  | "popular"
  | "claude"
  | "chatgpt"
  | "gemini"
  | "code"
  | "image"
  | "voice"
  | "search"
  // Capability tabs derived from the Models API metadata
  | "reasoning"
  | "tools"
  | "structured"
  | "vision"
  | "long-context";

export interface ModelFilter {
  category: ModelCategory;
  label: string;
  icon: string;
}

// --- API Key Types ---

export interface ApiKey {
  id: string;
  key: string; // Masked for display: "sk-or-...xxxx"
  label: string; // User-given name
  isActive: boolean; // Currently being used
  addedAt: number;
  lastUsed?: number;
  status: "valid" | "invalid" | "unknown" | "checking";
}

// --- Settings Types ---

// ── Generation (advanced) parameters ────────────────────────────────────────

export interface GenerationParams {
  temperature: number; // 0–2
  topP: number; // 0–1 (1 = no top-p sampling)
  topK: number; // 0 = off (only sent when > 0)
  maxTokens: number; // 0 = auto (not sent; free models still capped)
  presencePenalty: number; // -2–2 (0 = off)
  frequencyPenalty: number; // -2–2 (0 = off)
}

// ── Memory types ─────────────────────────────────────────────────────────────

export type MemoryMode = "off" | "ask" | "auto";

export interface Memory {
  id: string;
  text: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings extends GenerationParams {
  apiKeys: ApiKey[];
  activeKeyId: string | null;
  selectedModel: string;
  theme: "light" | "dark" | "system";
  systemPrompt: string; // Global system prompt
  codeMode: boolean;
  streamingEnabled: boolean;
  sidebarCollapsed: boolean;
  sendOnEnter: boolean;
  showTimestamps: boolean;
  memoryMode: MemoryMode;
}

// --- Chat Request Types ---

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatRequest {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  max_tokens?: number;
  temperature?: number;
  generationParams?: GenerationParams;
}

// ── Side-by-side model comparison ────────────────────────────────────────────

export type CompareSide = "a" | "b";

export interface CompareResult {
  model: string;
  content: string;
  reasoning: string;
  reasoningDuration?: number;
  isStreaming: boolean;
  isError: boolean;
  errorDetail?: string;
  startedAt: number | null;
  finishedAt: number | null;
}

export interface CompareSession {
  id: string;
  prompt: string;
  modelA: string;
  modelB: string;
  results: { a: CompareResult; b: CompareResult };
  startedAt: number | null;
  isRunning: boolean;
  /** Set once the session has been archived to history (prevents dupes). */
  archived?: boolean;
}

export interface CompareHistoryEntry {
  id: string;
  prompt: string;
  modelA: string;
  modelB: string;
  results: { a: CompareResult; b: CompareResult };
  startedAt: number;
  finishedAt: number;
}

export interface ChatStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
    };
    finish_reason: string | null;
    index: number;
  }>;
}

// --- UI State Types ---

export type ModalType =
  | "settings"
  | "rename"
  | "delete"
  | "system-prompt"
  | "confirm"
  | null;

export interface UIState {
  sidebarOpen: boolean;
  activeModal: ModalType;
  isGenerating: boolean;
  splitViewEnabled: boolean;
  previewContent: string;
}

// --- Store Action Types ---

export interface ChatActions {
  createConversation: (model?: string) => string;
  selectConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    content: string,
  ) => void;
  setMessageStreaming: (
    conversationId: string,
    messageId: string,
    isStreaming: boolean,
  ) => void;
  clearMessages: (conversationId: string) => void;
  setConversationModel: (conversationId: string, model: string) => void;
  setSystemPrompt: (conversationId: string, prompt: string) => void;
}

// ── File Upload ───────────────────────────────────────────────────────────────

export interface AttachedFile {
  id: string;
  name: string;
  type: string;       // MIME type
  size: number;       // bytes
  content: string;    // base64 for images, raw text for text files
  preview?: string;   // thumbnail URL for images
}

// ── Web Search ────────────────────────────────────────────────────────────────

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

// Update Message to support attachments
// (Add these fields to the existing Message interface)
// attachments?: AttachedFile[];
// searchResults?: WebSearchResult[];