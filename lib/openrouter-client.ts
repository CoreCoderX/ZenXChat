import { ChatMessage, GenerationParams } from "@/types";

const BASE_URL = "https://openrouter.ai/api/v1";

// ── Environment detection ─────────────────────────────────────────────────────

export function isCapacitorApp(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>)["Capacitor"];
}

export function getPlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  const cap = (
    window as unknown as Record<
      string,
      {
        getPlatform?: () => string;
      }
    >
  )["Capacitor"];
  const platform = cap?.getPlatform?.() ?? "web";
  if (platform === "android") return "android";
  if (platform === "ios") return "ios";
  return "web";
}

// ── Build standard headers ────────────────────────────────────────────────────

function buildHeaders(apiKey: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
    "HTTP-Referer": "https://openrouterchat.app",
    "X-Title": "OpenRouter Chat",
  };
}

// ── Stream options ────────────────────────────────────────────────────────────

export interface StreamOptions {
  model: string;
  messages: ChatMessage[];
  apiKey: string;
  signal?: AbortSignal;
  generationParams?: GenerationParams;
  onChunk: (chunk: string) => void;
  onReasoning?: (chunk: string) => void;
  onComplete: (full: string) => void;
  onError: (err: Error, availableProviders?: string[]) => void;
}

// ── Request body ──────────────────────────────────────────────────────────────

// Free models cap output server-side anyway. Sending an explicit modest
// max_tokens avoids the 402 "requires more credits, or fewer max_tokens" error
// when an account's balance can't cover the model's default output limit.
const MAX_FREE_MODEL_OUTPUT_TOKENS = 4096;

function isFreeModel(model: string): boolean {
  return model.endsWith(":free");
}

function buildRequestBody(
  model: string,
  messages: ChatMessage[],
  generationParams?: GenerationParams,
): string {
  const p = generationParams;
  const body: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };

  // Temperature is always sent (default 0.7)
  body.temperature =
    p && typeof p.temperature === "number" ? p.temperature : 0.7;

  // Top-p: send whenever the user has set it (1 = no top-p sampling)
  if (p && typeof p.topP === "number") body.top_p = p.topP;

  // Top-k: only sent when enabled (> 0) — some providers ignore it
  if (p && p.topK > 0) body.top_k = p.topK;

  // Penalties: only sent when non-zero
  if (p && p.presencePenalty !== 0) body.presence_penalty = p.presencePenalty;
  if (p && p.frequencyPenalty !== 0)
    body.frequency_penalty = p.frequencyPenalty;

  // max_tokens: the user's value wins; free models are still capped to avoid
  // the 402 "requires more credits, or fewer max_tokens" error.
  if (isFreeModel(model)) {
    body.max_tokens =
      p && p.maxTokens > 0
        ? Math.min(p.maxTokens, MAX_FREE_MODEL_OUTPUT_TOKENS)
        : MAX_FREE_MODEL_OUTPUT_TOKENS;
  } else if (p && p.maxTokens > 0) {
    body.max_tokens = p.maxTokens;
  }

  return JSON.stringify(body);
}

// ── Reasoning / usage extraction helpers ─────────────────────────────────────

// OpenRouter forwards provider reasoning in delta.reasoning (DeepSeek R1 etc.);
// some providers use reasoning_content or reasoning_summary instead.
function extractReasoningDelta(delta: Record<string, unknown> | undefined): string {
  if (!delta) return "";
  for (const key of ["reasoning", "reasoning_content", "reasoning_summary"]) {
    const v = delta[key];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return "";
}

// ── Error helpers ────────────────────────────────────────────────────────────

// Attach the HTTP status to an error so the UI can classify it (402, 429, ...).
function withStatus(err: Error, status?: number): Error {
  if (status !== undefined) {
    (err as Error & { status?: number }).status = status;
  }
  return err;
}

// Extract error message + optional numeric code from an OpenRouter error object.
function parseErrorObject(
  error: unknown,
): { message: string; code?: number } {
  if (typeof error === "string") return { message: error };
  const obj = error as Record<string, unknown> | null;
  if (!obj) return { message: "Unknown error" };
  const message = String(obj.message ?? JSON.stringify(error));
  const code = typeof obj.code === "number" ? obj.code : undefined;
  return { message, code };
}

// ── Parse error from OpenRouter response body ─────────────────────────────────

function parseError(text: string): { message: string; providers: string[] } {
  try {
    const j = JSON.parse(text);
    return {
      message: j?.error?.message ?? j?.message ?? text,
      providers: j?.error?.metadata?.available_providers ?? [],
    };
  } catch {
    return { message: text, providers: [] };
  }
}

// ── SSE stream parser (Web) ───────────────────────────────────────────────────

async function consumeStream(
  body: ReadableStream<Uint8Array>,
  opts: StreamOptions,
): Promise<void> {
  const { onChunk, onReasoning, onComplete, onError } = opts;
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const t = line.trim();
        if (!t || t === ":") continue;
        if (!t.startsWith("data:")) continue;

        const payload = t.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          onComplete(full);
          return;
        }

        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          if (parsed?.error) {
            const { message, code } = parseErrorObject(parsed.error);
            onError(withStatus(new Error(message), code), []);
            return;
          }

          const delta = (parsed?.choices as Record<string, unknown>[] | undefined)?.[0]
            ?.delta as Record<string, unknown> | undefined;
          const content = delta?.content;
          if (typeof content === "string" && content.length > 0) {
            full += content;
            onChunk(content);
          }

          const reasoning = extractReasoningDelta(delta);
          if (reasoning) onReasoning?.(reasoning);
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }
    onComplete(full);
  } catch (err) {
    if (
      (err as Error).name === "AbortError" ||
      (err as Error).message?.includes("aborted")
    ) {
      onComplete(full);
      return;
    }
    onError(err as Error, []);
  }
}

// ── Mobile: XHR Streaming (Bypasses WebView fetch buffering bug) ──────────────

async function fetchStreamingMobileXHR(opts: StreamOptions): Promise<void> {
  const {
    model,
    messages,
    apiKey,
    signal,
    generationParams,
    onChunk,
    onReasoning,
    onComplete,
    onError,
  } = opts;

  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${BASE_URL}/chat/completions`);

    // Apply headers
    const headers = buildHeaders(apiKey);
    for (const [key, value] of Object.entries(headers)) {
      xhr.setRequestHeader(key, value);
    }

    let fullText = "";
    let lastIndex = 0;
    let buffer = "";

    // This is the magic: onprogress fires for every chunk, bypassing fetch buffering
    xhr.onprogress = () => {
      const newData = xhr.responseText.slice(lastIndex);
      lastIndex = xhr.responseText.length;
      buffer += newData;

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const t = line.trim();
        if (!t || t === ":") continue;
        if (!t.startsWith("data:")) continue;

        const payload = t.replace(/^data:\s*/, "");
        if (payload === "[DONE]") {
          onComplete(fullText);
          resolve();
          return;
        }

        try {
          const parsed = JSON.parse(payload) as Record<string, unknown>;
          if (parsed?.error) {
            const { message, code } = parseErrorObject(parsed.error);
            onError(withStatus(new Error(message), code), []);
            resolve();
            return;
          }

          const delta = (parsed?.choices as Record<string, unknown>[] | undefined)?.[0]
            ?.delta as Record<string, unknown> | undefined;
          const content = delta?.content;
          if (typeof content === "string" && content.length > 0) {
            fullText += content;
            onChunk(content);
          }

          const reasoning = extractReasoningDelta(delta);
          if (reasoning) onReasoning?.(reasoning);
        } catch {
          // Skip malformed chunks
        }
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onComplete(fullText);
      } else {
        const { message, providers } = parseError(xhr.responseText);
        onError(withStatus(new Error(message), xhr.status), providers);
      }
      resolve();
    };

    xhr.onerror = () => {
      onError(new Error("Network error — check your internet connection."), []);
      resolve();
    };

    xhr.onabort = () => {
      onComplete(fullText);
      resolve();
    };

    // Handle AbortController
    if (signal) {
      signal.addEventListener("abort", () => xhr.abort());
    }

    xhr.send(buildRequestBody(model, messages, generationParams));
  });
}

// ── Web: standard SSE streaming ────────────────────────────────────────────────

async function fetchStreamingWeb(opts: StreamOptions): Promise<void> {
  const {
    model,
    messages,
    apiKey,
    signal,
    generationParams,
    onComplete,
    onError,
  } = opts;

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: buildRequestBody(model, messages, generationParams),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const { message, providers } = parseError(text);
      onError(withStatus(new Error(message), res.status), providers);
      return;
    }

    if (!res.body) {
      onError(new Error("No response body from server"));
      return;
    }

    await consumeStream(res.body, opts);
  } catch (err) {
    if ((err as Error).name === "AbortError") {
      onComplete("");
      return;
    }
    onError(new Error((err as Error).message ?? "Unknown error"), []);
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function streamChatDirect(opts: StreamOptions): Promise<void> {
  const platform = getPlatform();
  console.log("[streamChatDirect] platform:", platform, "model:", opts.model);

  // MOBILE (Android & iOS): Use XHR to bypass WebView fetch buffering
  if (platform === "android" || platform === "ios") {
    return fetchStreamingMobileXHR(opts);
  }

  // WEB: Use standard fetch ReadableStream
  return fetchStreamingWeb(opts);
}