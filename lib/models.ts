import { ModelCategory, ModelFilter, OpenRouterModel } from "@/types";

export const MODEL_FILTERS: ModelFilter[] = [
  { category: "all", label: "All Models", icon: "Grid" },
  { category: "free", label: "Free", icon: "Sparkles" },
  { category: "popular", label: "Popular", icon: "TrendingUp" },
  { category: "claude", label: "Claude", icon: "Bot" },
  { category: "chatgpt", label: "ChatGPT", icon: "MessageSquare" },
  { category: "gemini", label: "Gemini", icon: "Gem" },
  { category: "code", label: "Code", icon: "Code2" },
  { category: "image", label: "Image", icon: "Image" },
  { category: "voice", label: "Voice", icon: "Mic" },
  { category: "search", label: "Web Search", icon: "Globe" },
  // ── Capability tabs (auto-derived from the Models API metadata) ──
  { category: "reasoning", label: "Reasoning", icon: "Brain" },
  { category: "tools", label: "Tools", icon: "Wrench" },
  { category: "structured", label: "Structured", icon: "Braces" },
  { category: "vision", label: "Vision", icon: "Eye" },
  { category: "long-context", label: "Long Context", icon: "StretchHorizontal" },
];

// Popular models — prioritise providers available on free/low-cost accounts
export const POPULAR_MODEL_IDS = new Set([
  // Google (google-ai-studio)
  "google/gemini-2.0-flash-001",
  "google/gemini-2.5-flash-preview",
  "google/gemini-2.5-pro-preview",
  "google/gemini-pro-1.5",
  "google/gemini-flash-1.5",
  "google/gemini-flash-1.5-8b",
  // NVIDIA
  "nvidia/llama-3.1-nemotron-70b-instruct",
  "nvidia/llama-3.3-nemotron-super-49b-v1",
  // xAI
  "x-ai/grok-3-beta",
  "x-ai/grok-3-mini-beta",
  "x-ai/grok-2-1212",
  // Anthropic Claude
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3-5-haiku",
  "anthropic/claude-3-opus",
  // OpenAI
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  // Meta Llama
  "meta-llama/llama-3.3-70b-instruct",
  "meta-llama/llama-3.1-405b-instruct",
  // Mistral
  "mistralai/mistral-large",
  "mistralai/mistral-small",
  // DeepSeek
  "deepseek/deepseek-chat-v3-0324",
  "deepseek/deepseek-r1",
]);

export const CODE_MODEL_KEYWORDS = [
  "code",
  "coder",
  "codex",
  "starcoder",
  "deepseek-coder",
  "wizard-coder",
  "phind",
  "codellama",
  "qwen-coder",
  "devstral",
];

export const IMAGE_MODEL_IDS = new Set([
  "openai/gpt-4o",
  "openai/gpt-4-vision-preview",
  "anthropic/claude-3-5-sonnet",
  "anthropic/claude-3-opus",
  "anthropic/claude-3-haiku",
  "google/gemini-pro-1.5",
  "google/gemini-flash-1.5",
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.2-11b-vision-instruct",
  "meta-llama/llama-3.2-90b-vision-instruct",
  "qwen/qwen-2-vl-72b-instruct",
  "mistralai/pixtral-large-2411",
  "x-ai/grok-2-vision-1212",
]);

export const VOICE_MODEL_IDS = new Set([
  "openai/gpt-4o-audio-preview",
  "openai/gpt-4o-realtime-preview",
  "fixie-ai/ultravox",
]);

export const SEARCH_MODEL_IDS = new Set([
  "perplexity/llama-3.1-sonar-small-128k-online",
  "perplexity/llama-3.1-sonar-large-128k-online",
  "perplexity/llama-3.1-sonar-huge-128k-online",
  "openai/gpt-4o-search-preview",
  "openai/gpt-4o-mini-search-preview",
  "google/gemini-2.0-flash-001",
  "x-ai/grok-3-beta",
]);

// ── Enrich raw model data ─────────────────────────────────────────────────────

export function enrichModel(raw: Record<string, unknown>): OpenRouterModel {
  const id = (raw.id as string) || "";
  const pricing = (raw.pricing as {
    prompt: string;
    completion: string;
  }) || { prompt: "0", completion: "0" };

  const isFree =
    (pricing.prompt === "0" || pricing.prompt === "0.0") &&
    (pricing.completion === "0" || pricing.completion === "0.0");

  const provider = id.split("/")[0] || "unknown";
  const isPopular = POPULAR_MODEL_IDS.has(id);
  const context_length = (raw.context_length as number) || 4096;

  // ── Capability flags from the Models API metadata ────────────────────────
  const supported_parameters = Array.isArray(raw.supported_parameters)
    ? (raw.supported_parameters as string[])
    : [];
  const modality =
    (raw.architecture as { modality?: string } | undefined)?.modality ?? "";

  const supportsReasoning =
    supported_parameters.includes("reasoning") ||
    /(?:^|[\/-])(?:r1|o1|o3|o4|reasoning|thinking)(?:[\/-]|$)/i.test(id);
  const supportsTools = supported_parameters.includes("tools");
  const supportsStructuredOutputs =
    supported_parameters.includes("structured_outputs") ||
    supported_parameters.includes("json_mode");
  const supportsVision =
    modality.toLowerCase().includes("image") || IMAGE_MODEL_IDS.has(id);
  const isLongContext = context_length >= 200_000;

  const categories: ModelCategory[] = ["all"];
  if (isFree) categories.push("free");
  if (isPopular) categories.push("popular");
  if (provider === "anthropic" || id.includes("claude"))
    categories.push("claude");
  if (provider === "openai") categories.push("chatgpt");
  if (provider === "google" || id.includes("gemini")) categories.push("gemini");
  if (CODE_MODEL_KEYWORDS.some((kw) => id.toLowerCase().includes(kw)))
    categories.push("code");
  if (IMAGE_MODEL_IDS.has(id)) categories.push("image");
  if (VOICE_MODEL_IDS.has(id)) categories.push("voice");
  if (SEARCH_MODEL_IDS.has(id)) categories.push("search");
  if (supportsReasoning) categories.push("reasoning");
  if (supportsTools) categories.push("tools");
  if (supportsStructuredOutputs) categories.push("structured");
  if (supportsVision) categories.push("vision");
  if (isLongContext) categories.push("long-context");

  return {
    id,
    name: (raw.name as string) || id,
    description: raw.description as string | undefined,
    context_length,
    pricing,
    top_provider: raw.top_provider as OpenRouterModel["top_provider"],
    architecture: raw.architecture as OpenRouterModel["architecture"],
    supported_parameters,
    provider,
    isFree,
    isPopular,
    category: categories,
    supportsReasoning,
    supportsTools,
    supportsStructuredOutputs,
    supportsVision,
    isLongContext,
  };
}

// ── Filter models ─────────────────────────────────────────────────────────────

export function filterModels(
  models: OpenRouterModel[],
  category: ModelCategory,
  searchQuery: string,
): OpenRouterModel[] {
  let filtered = models;

  if (category !== "all") {
    filtered = filtered.filter((m) => m.category.includes(category));
  }

  if (searchQuery.trim()) {
    const q = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.provider.toLowerCase().includes(q) ||
        (m.description ?? "").toLowerCase().includes(q),
    );
  }

  return filtered;
}

// ── Formatting helpers ────────────────────────────────────────────────────────

export function formatModelPrice(pricing: {
  prompt: string;
  completion: string;
}): string {
  const p = parseFloat(pricing.prompt);
  const c = parseFloat(pricing.completion);
  if (p === 0 && c === 0) return "Free";
  return `$${(p * 1e6).toFixed(2)} / $${(c * 1e6).toFixed(2)} per 1M`;
}

export function formatContextLength(length: number): string {
  if (length >= 1_000_000) return `${(length / 1_000_000).toFixed(1)}M ctx`;
  if (length >= 1_000) return `${Math.round(length / 1_000)}K ctx`;
  return `${length} ctx`;
}

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  google: "Google",
  "meta-llama": "Meta",
  mistralai: "Mistral AI",
  deepseek: "DeepSeek",
  perplexity: "Perplexity",
  cohere: "Cohere",
  "01-ai": "01.AI",
  qwen: "Qwen",
  microsoft: "Microsoft",
  nvidia: "NVIDIA",
  "x-ai": "xAI",
  "arcee-ai": "Arcee AI",
  venice: "Venice",
  "z-ai": "Z.AI",
};

export function getProviderDisplayName(provider: string): string {
  return PROVIDER_DISPLAY_NAMES[provider] || provider;
}

// ── Model fetching (with cache) ───────────────────────────────────────────────

const MODELS_CACHE_KEY = "or_models_cache";
const MODELS_CACHE_TTL = 1000 * 60 * 30;

export async function fetchOpenRouterModels(
  apiKey?: string,
): Promise<OpenRouterModel[]> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(MODELS_CACHE_KEY);
      if (raw) {
        const { data, timestamp } = JSON.parse(raw) as {
          data: OpenRouterModel[];
          timestamp: number;
        };
        if (Date.now() - timestamp < MODELS_CACHE_TTL) return data;
      }
    } catch {
      /* ignore */
    }
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "HTTP-Referer":
      typeof window !== "undefined"
        ? window.location.origin
        : "http://localhost:3000",
    "X-Title": "OpenRouter Chat",
  };
  if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

  const res = await fetch("https://openrouter.ai/api/v1/models", { headers });
  if (!res.ok) throw new Error(`Failed to fetch models: ${res.status}`);

  const json = (await res.json()) as { data: Record<string, unknown>[] };
  const models = json.data.map(enrichModel);

  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(
        MODELS_CACHE_KEY,
        JSON.stringify({ data: models, timestamp: Date.now() }),
      );
    } catch {
      /* quota */
    }
  }

  return models;
}
