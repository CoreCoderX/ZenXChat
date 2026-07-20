import { ChatMessage } from "@/types";

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
  onChunk: (chunk: string) => void;
  onComplete: (full: string) => void;
  onError: (err: Error, availableProviders?: string[]) => void;
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
  onChunk: (c: string) => void,
  onComplete: (full: string) => void,
  onError: (err: Error, providers?: string[]) => void,
): Promise<void> {
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
          const parsed = JSON.parse(payload);
          if (parsed?.error) {
            const msg = typeof parsed.error === "string" ? parsed.error : (parsed.error?.message ?? JSON.stringify(parsed.error));
            onError(new Error(msg), []);
            return;
          }
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            full += delta;
            onChunk(delta);
          }
        } catch {
          // Skip malformed SSE chunks
        }
      }
    }
    onComplete(full);
  } catch (err) {
    if ((err as Error).name === "AbortError" || (err as Error).message?.includes("aborted")) {
      onComplete(full);
      return;
    }
    onError(err as Error, []);
  }
}

// ── Mobile: XHR Streaming (Bypasses WebView fetch buffering bug) ──────────────

async function fetchStreamingMobileXHR(opts: StreamOptions): Promise<void> {
  const { model, messages, apiKey, signal, onChunk, onComplete, onError } = opts;

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
          const parsed = JSON.parse(payload);
          if (parsed?.error) {
            const msg = typeof parsed.error === "string" ? parsed.error : (parsed.error?.message ?? JSON.stringify(parsed.error));
            onError(new Error(msg), []);
            resolve();
            return;
          }
          const delta = parsed?.choices?.[0]?.delta?.content;
          if (typeof delta === "string" && delta.length > 0) {
            fullText += delta;
            onChunk(delta);
          }
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
        onError(new Error(message), providers);
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

    xhr.send(
      JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
    );
  });
}

// ── Web: standard SSE streaming ────────────────────────────────────────────────

async function fetchStreamingWeb(opts: StreamOptions): Promise<void> {
  const { model, messages, apiKey, signal, onChunk, onComplete, onError } = opts;

  try {
    const res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: buildHeaders(apiKey),
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        temperature: 0.7,
      }),
      signal,
    });

    if (!res.ok) {
      const text = await res.text();
      const { message, providers } = parseError(text);
      onError(new Error(message), providers);
      return;
    }

    if (!res.body) {
      onError(new Error("No response body from server"));
      return;
    }

    await consumeStream(res.body, onChunk, onComplete, onError);
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