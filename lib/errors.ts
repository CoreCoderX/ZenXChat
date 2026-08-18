// Map raw OpenRouter errors to friendly in-chat messages, while keeping the
// full detail available behind a small "!" in the UI.

export interface ApiError extends Error {
  status?: number;
}

export interface FriendlyError {
  /** Markdown-friendly message shown in the chat bubble. */
  friendly: string;
  /** Plain-text detail (status, model, raw error) shown on demand. */
  detail: string;
}

export function friendlyErrorMessage(
  err: Error,
  model: string,
): FriendlyError {
  const status = (err as ApiError).status;
  const raw = err.message || "Unknown error";
  const lower = raw.toLowerCase();

  let friendly: string;

  if (status === 401 || /invalid api key|unauthorized|authentication/i.test(lower)) {
    friendly =
      `Your **API key** appears to be invalid or expired.\n\n` +
      `Please update it in **Settings → API Keys** and try again.`;
  } else if (
    status === 402 ||
    /requires more credits|insufficient credits|payment required|billing/i.test(lower)
  ) {
    friendly =
      `Your OpenRouter account doesn't have enough **credits** for this request.\n\n` +
      `Add credits at [openrouter.ai/settings/credits](https://openrouter.ai/settings/credits) ` +
      `or pick a **free model** from the model selector.`;
  } else if (
    status === 429 ||
    /rate limit|too many requests|free model.*limit/i.test(lower)
  ) {
    friendly =
      `You've hit a **rate limit** — free models allow only 50 requests per day ` +
      `unless you've added $10+ in credits.\n\n` +
      `Wait a bit and retry, switch models, or add credits to raise the limit.`;
  } else if (
    status === 404 ||
    /model not found|does not exist|unknown model|invalid model/i.test(lower)
  ) {
    friendly =
      `This **model isn't available** on OpenRouter right now.\n\n` +
      `Pick a different model from the model selector.`;
  } else if (
    /context length|context_length|maximum context|token limit|too many tokens|exceeded.*context|context window/i.test(
      lower,
    )
  ) {
    friendly =
      `This conversation **exceeds the model's context window**.\n\n` +
      `Start a new chat or shorten the conversation.`;
  } else if (
    /provider returned error|upstream|bad gateway|502|503|temporarily unavailable|overloaded/i.test(
      lower,
    )
  ) {
    friendly =
      `The **AI provider** had trouble handling this request.\n\n` +
      `Please try again in a moment or pick a different model.`;
  } else if (
    /network|failed to fetch|internet connection|timeout|timed out|connection/i.test(
      lower,
    )
  ) {
    friendly =
      `**Network error** — couldn't reach OpenRouter.\n\n` +
      `Check your internet connection and try again.`;
  } else {
    friendly =
      `**Something went wrong** while generating a response.\n\n` +
      `Please try again, switch models, or check your API key in **Settings → API Keys**.`;
  }

  const detail = [
    `Status: ${status ?? "unknown"}`,
    `Model: ${model}`,
    `Raw error: ${raw}`,
  ].join("\n\n");

  return { friendly, detail };
}
