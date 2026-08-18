import { Memory } from "@/types";
import { MAX_MEMORY_CHARS } from "@/store/memoryStore";

// ── Limits for what gets injected into a request ─────────────────────────────
export const MAX_MEMORIES_IN_CONTEXT = 12;
export const MAX_CONTEXT_MEMORY_CHARS = 1500;
export const MAX_SUGGESTIONS_PER_MESSAGE = 3;

// ── Detection heuristics ─────────────────────────────────────────────────────
// Explicit keywords — the user is telling us to store something.
const MEMORY_EXPLICIT_KEYWORDS = [
  "remember that",
  "remember this",
  "remember",
  "save this",
  "save that",
  "add to memory",
  "add into memory",
  "store this",
  "note that",
  "don't forget",
  "do not forget",
  "keep in mind",
  "take note",
  "make a note",
];

// Personal-detail patterns — the user is sharing a fact about themselves.
const MEMORY_PERSONAL_PATTERNS: RegExp[] = [
  /\bmy name is\b/i,
  /\bi('| a)?m (?:called|named)\b/i,
  /\bi prefer\b/i,
  /\bi (?:really |absolutely |definitely )?like\b/i,
  /\bi (?:really )?love\b/i,
  /\bi (?:don't|do not|dont) like\b/i,
  /\bi (?:dislike|hate)\b/i,
  /\bmy favorite\b/i,
  /\bmy favourite\b/i,
  /\bi (?:work|work at|work as|work for|am working as|study|study at|live|live in|live at|am from|am based in|am based at|am located in)\b/i,
  /\bi use\b/i,
  /\bi (?:speak|can speak|am fluent in)\b/i,
  /\bmy (?:birthday|age|email|phone|phone number|website|github|linkedin|company|team|role|job|occupation|hobby|hobbies)\b/i,
  /\bmy (?:native|first|second) language\b/i,
  /\bi(?:'m| am) (?:a|an) (?:developer|engineer|designer|student|teacher|writer|researcher|founder|manager|analyst|scientist|freelancer)\b/i,
];

function cleanCandidate(text: string): string | null {
  let t = text.trim();
  if (t.length < 8) return null;
  if (t.length > MAX_MEMORY_CHARS) t = t.slice(0, MAX_MEMORY_CHARS - 1) + "…";
  // "remember to …" is a to-do, not a personal fact
  if (/^to\b/i.test(t)) return null;
  // Facts addressed back at the assistant aren't personalization
  if (/^(you|your)\b/i.test(t)) return null;
  t = t.charAt(0).toUpperCase() + t.slice(1);
  return t;
}

/**
 * Scan a user message for memory-worthy details.
 * Conservative by design: explicit save keywords and clear personal-detail
 * patterns only — the user always stays in control of what gets stored.
 */
export function detectMemoryCandidates(message: string): string[] {
  const sentences = message
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates: string[] = [];

  for (const sentence of sentences) {
    if (/\?\s*$/.test(sentence)) continue;

    // Explicit keywords — keep the remainder after the keyword
    let keywordMatched = false;
    for (const kw of MEMORY_EXPLICIT_KEYWORDS) {
      const idx = sentence.toLowerCase().indexOf(kw);
      if (idx === -1) continue;
      let rest = sentence.slice(idx + kw.length);
      rest = rest.replace(/^(that|this|it|the following)\b[\s:]*/i, "");
      rest = rest.replace(/^[\s:;,\-–—]+/, "");
      const candidate = cleanCandidate(rest);
      if (candidate) candidates.push(candidate);
      keywordMatched = true;
      break;
    }
    // The keyword extraction already captured the fact — don't also grab the
    // whole sentence via a personal pattern (avoids duplicate suggestions).
    if (keywordMatched) continue;

    // Personal-detail patterns — keep the whole sentence
    for (const pattern of MEMORY_PERSONAL_PATTERNS) {
      if (pattern.test(sentence)) {
        const candidate = cleanCandidate(sentence);
        if (candidate) candidates.push(candidate);
        break;
      }
    }
  }

  // Dedupe (case-insensitive), keep order, cap the number of suggestions
  const seen = new Set<string>();
  const result: string[] = [];
  for (const c of candidates) {
    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(c);
    if (result.length >= MAX_SUGGESTIONS_PER_MESSAGE) break;
  }
  return result;
}

/**
 * Build the system message that hands saved facts to the model.
 * Returns null when there is nothing worth injecting.
 */
export function buildMemoryContextMessage(memories: Memory[]): string | null {
  const active = memories
    .filter((m) => m.enabled && m.text.trim().length > 0)
    .slice(0, MAX_MEMORIES_IN_CONTEXT);

  if (active.length === 0) return null;

  const lines: string[] = [];
  let used = 0;
  for (const m of active) {
    const line = `- ${m.text.trim()}`;
    if (used + line.length > MAX_CONTEXT_MEMORY_CHARS) break;
    lines.push(line);
    used += line.length;
  }
  if (lines.length === 0) return null;

  return (
    "You have access to these saved facts about the user — use them to " +
    "personalize your responses, and never invent facts not listed here:\n" +
    lines.join("\n")
  );
}
