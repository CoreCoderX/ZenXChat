# ZenXChat

> A premium, cross-platform AI chat application powered by [OpenRouter](https://openrouter.ai) — runs natively on Android via Capacitor and in any modern browser.

[![Next.js](https://img.shields.io/badge/Next.js-16.2.10-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.2.7-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.17-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com)
[![Capacitor](https://img.shields.io/badge/Capacitor-8.4.2-119EFF?style=flat-square&logo=capacitor)](https://capacitorjs.com)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-12.42.2-black?style=flat-square&logo=framer)](https://www.framer.com/motion)
[![License: MIT](https://img.shields.io/badge/License-MIT-22C55E?style=flat-square)](LICENSE)

---

## ✨ Features

### Core Chat Experience
- **Multi-model support** — Access any model available on OpenRouter (GPT, Claude, Gemini, Mistral, DeepSeek, etc.)
- **Real-time SSE streaming** — Token-by-token smooth typewriter text streaming on all platforms
- **Dynamic typewriter rendering** — Intelligent buffer queue flushes text at 60fps, scaling character consumption dynamically to stay smooth on both slow and fast models
- **Markdown rendering** — Full GitHub Flavored Markdown (GFM) with tables, blockquotes, lists, and inline code
- **Syntax-highlighted code blocks** — Powered by [Shiki](https://shiki.matsu.io) with GitHub Dark/Light themes
- **Code preview panel** — Live preview HTML, CSS, and JavaScript code in a sandboxed iframe (split or floating view)
- **Message editing & resend** — Polished in-place editor card (auto-growing textarea, Enter to send, Esc to cancel); re-submit even without modifications
- **Message regeneration** — Regenerate the last assistant response with a single tap
- **Stop generation** — Cancel an in-progress response instantly at any point
- **File attachments** — Attach images, documents, code files, PDFs, and CSVs (up to 10 MB per file)
- **Web search toggle** — Ask questions with real-time web context
- **Friendly in-chat errors** — Rate limits, missing credits, invalid keys, and provider hiccups become readable messages, with a "!" to reveal the full raw error

### AI Loader & Reasoning
- **Thinking loader** — `dots` / `bar` / `grid` loaders share one animation beat and show a live elapsed timer while waiting for the first token
- **Live reasoning traces** — The model's thinking (`delta.reasoning`) streams in real time, then collapses to "Thought for 4.2s" once the answer lands
- **Reduced-motion aware** — Loaders and reasoning panels hold static, legible states under `prefers-reduced-motion`

### Side-by-Side Model Comparison
- **Compare two models at once** — Send one prompt and watch two models generate simultaneously, each with its own live streaming, reasoning trace, and elapsed timer
- **Compare history** — Past comparisons archive automatically into a history popover (reopen, delete, or clear all); model pickers persist between sessions
- **New comparison** — One tap starts fresh, aborting any in-flight generation
- **Adopt an answer** — "Use this response" drops the winning answer into your active conversation with its model tagged
- **Fully responsive** — Cards sit side-by-side on tablet and desktop, stack on mobile, and the arena scrolls as one surface so touch works everywhere

### Memory & Personalization
- **Prompt-driven detection** — Personal details ("I prefer…", "my name is…", "I work at…") and explicit keywords ("remember that…", "save this…") are detected automatically
- **You stay in control** — Ask-before-saving confirmation card ("Remember this?"), fully automatic mode with a saved-fact notice, or memory fully off
- **Bounded, not unlimited** — Capped at 50 memories / 500 chars each / 10k total, with LRU eviction and a live usage meter
- **Full memory management** — Edit, delete, or disable any memory; enabled memories are injected into every request as personalization context

### Advanced Generation Controls
- **Developer parameters** — Temperature, Top P, Top K, max tokens, and presence & frequency penalties, applied to every chat and compare request (only non-default values are sent)
- **AI system-prompt polish** — Rewrite your global system prompt with a free model, preview the result, and apply or discard

### Conversation Management
- **Persistent chat history** — All conversations saved locally via `@capacitor/preferences`
- **Auto-title generation** — Conversations are titled automatically from the first message
- **Sorted by last activity** — Most recently active chats always appear at the top of the sidebar
- **Rename conversations** — Double-click any conversation title to rename it
- **Duplicate conversations** — Fork any conversation to explore alternate paths
- **Delete conversations** — Delete individual conversations with a confirmation dialog
- **Clear all history** — Wipe all conversations with a dedicated confirmation dialog
- **Search history** — Filter conversations by title in the sidebar search bar

### API Key Management
- **Multiple API keys** — Add and manage multiple OpenRouter API keys
- **Key validation** — Keys are validated against the OpenRouter API on save
- **Automatic fallback** — If one key fails, the app automatically retries with the next available key
- **Usage display** — Shows credit balance and limits per key
- **Provider order fallback** — Automatically retries with alternate providers on model failures

### Cross-Platform Mobile (Android)
- **Native Android APK** — Built with Capacitor 8 targeting Android API 23+ (Android 6.0+)
- **XHR-based SSE streaming** — Bypasses WebView fetch buffering using `XMLHttpRequest.onprogress` for true streaming on mobile
- **Touch-responsive scroll** — `touchmove` listener cancels auto-scroll the instant the user swipes, allowing free scroll during generation
- **Code block touch pass-through** — `pointer-events: none` applied to code containers during streaming to pass touch events to the parent scroller
- **Mobile Enter key behavior** — Enter inserts newlines on virtual keyboards; send is always via the Send button
- **Mobile FAB for new chat** — Floating `+` button in the top-right corner for creating a new conversation without opening the sidebar

### Desktop
- **Keyboard shortcuts** — `Ctrl+N` for new chat, `Enter` to send, `Shift+Enter` for newline
- **Split-screen preview** — Resizable code preview panel side-by-side with chat
- **Floating preview window** — Draggable floating preview overlay with handle bar
- **Mouse wheel scroll control** — Mouse wheel scroll up during generation immediately pauses auto-scroll

### UI & Design
- **Light / Dark / System themes** — Follows OS preference or manual toggle
- **Glassmorphism design system** — Premium card blur effects, subtle gradients, and layered depth
- **Framer Motion animations** — Smooth sidebar transitions, confirmation dialogs, button interactions, and toast notifications
- **Responsive layout** — Fluid columns on desktop, full-screen chat on mobile
- **Safe-area insets** — Proper notch/status bar handling on mobile via CSS `env(safe-area-inset-*)`
- **Scroll-to-bottom button** — Appears when user scrolls up during streaming, snaps back to live content on click
- **Auto-scroll locking** — Smart auto-scroll pauses when user scrolls up, resumes when they return to the bottom

### Performance Optimizations
- **Decoupled input state** — Typing state is local to `ChatInput`; no global re-renders on keystrokes
- **Skip Shiki during streaming** — Code blocks use fast `textContent` updates while generating; Shiki syntax highlighting runs once on completion
- **Cancelled scroll timers** — Each streaming chunk cancels its predecessor's pending scroll timer, preventing scroll queue buildup
- **Compositing layer hints** — `will-change: scroll-position` and `isolation: isolate` on the message scroll container

---

## 🛠 Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| [Next.js](https://nextjs.org) | `16.2.10` | React framework, static export for Capacitor |
| [React](https://react.dev) | `19.2.7` | UI component library |
| [TypeScript](https://www.typescriptlang.org) | `5.9.3` | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | `3.4.17` | Utility-first styling |
| [Capacitor](https://capacitorjs.com) | `8.4.2` | Native Android/iOS runtime |
| [Framer Motion](https://www.framer.com/motion) | `12.42.2` | Animations and transitions |
| [Zustand](https://zustand-demo.pmnd.rs) | `5.0.14` | Lightweight global state management |
| [Shiki](https://shiki.matsu.io) | `4.3.1` | Syntax highlighting |
| [react-markdown](https://github.com/remarkjs/react-markdown) | `10.1.0` | Markdown rendering |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | `4.0.1` | GitHub Flavored Markdown |
| [rehype-raw](https://github.com/rehypejs/rehype-raw) | `7.0.0` | Raw HTML in markdown |
| [lucide-react](https://lucide.dev) | `1.25.0` | Icon library |
| [react-textarea-autosize](https://github.com/Andarist/react-textarea-autosize) | `8.5.9` | Auto-growing textarea |
| [date-fns](https://date-fns.org) | `4.4.0` | Date formatting |
| [uuid](https://github.com/uuidjs/uuid) | `14.0.1` | Unique ID generation |

---

## 📁 Project Structure

```
ZenXChat/
├── app/
│   ├── layout.tsx            # Root layout with theme provider
│   └── page.tsx              # Main page entry
├── components/
│   ├── chat/
│   │   ├── ChatArea.tsx      # Main chat column, compare mode, split layout
│   │   ├── ChatHeader.tsx    # Floating header: model selector, compare toggle
│   │   ├── ChatInput.tsx     # Message composer (local state, no parent re-renders)
│   │   ├── MessageBubble.tsx # Message with edit card, memory confirm, error "!"
│   │   └── MessageList.tsx   # Scrollable message container with smart auto-scroll
│   ├── compare/
│   │   ├── CompareView.tsx   # Compare arena: model pickers, history, result cards
│   │   ├── CompareCard.tsx   # Per-model result card (loader, reasoning, actions)
│   │   └── ModelPicker.tsx   # Compact searchable model dropdown
│   ├── layout/
│   │   ├── AppShell.tsx      # Root app layout (sidebar + chat area)
│   │   ├── Sidebar.tsx       # Conversation list, search, actions
│   │   └── ConversationList.tsx
│   ├── markdown/
│   │   ├── MarkdownRenderer.tsx  # react-markdown with custom component overrides
│   │   └── CodeBlock.tsx        # Shiki syntax highlighting, copy, preview
│   ├── preview/
│   │   └── SplitView.tsx    # Sandboxed iframe code preview
│   ├── settings/
│   │   ├── SettingsModal.tsx    # Tabbed settings (Models, Keys, General, Advanced, Memory)
│   │   ├── ModelSelector.tsx    # Search + capability category tabs
│   │   ├── ApiKeyManager.tsx    # Key CRUD, validation, fallback management
│   │   ├── GeneralSettings.tsx  # Appearance, system prompt + AI polish
│   │   ├── AdvancedSettings.tsx # Generation parameters (temperature, top_k, …)
│   │   └── MemorySettings.tsx   # Memory mode, list, usage meter
│   ├── smoothui/
│   │   ├── AILoader.tsx      # Thinking loader: dots / bar / grid + elapsed timer
│   │   └── AIReasoning.tsx   # Collapsible live reasoning trace
│   └── ui/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── Tooltip.tsx
├── hooks/
│   ├── useChat.ts            # Core streaming pipeline with typewriter buffer
│   ├── useCompare.ts         # Parallel two-model comparison streaming
│   └── useModels.ts          # Cached OpenRouter model list fetch
├── lib/
│   ├── openrouter-client.ts  # SSE streaming (Web: fetch, Mobile: XHR) + generation params
│   ├── models.ts             # Model metadata, capability flags, caching
│   ├── memory.ts             # Memory detection heuristics + injection
│   ├── errors.ts             # Friendly error mapping
│   ├── polish.ts             # AI system-prompt polishing
│   └── utils.ts              # Utility helpers
├── store/
│   ├── chatStore.ts          # Conversations, messages, CRUD actions (persisted)
│   ├── compareStore.ts       # Compare sessions + history (persisted)
│   ├── memoryStore.ts        # Memories + caps (persisted)
│   ├── settingsStore.ts      # API keys, model, theme, generation params, memory mode
│   └── uiStore.ts            # Generating state, abort controller, modal, compare mode
├── android/                  # Capacitor Android project
├── capacitor.config.ts       # Capacitor build configuration
├── tailwind.config.ts        # Tailwind design tokens
└── package.json
```

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) >= 18
- npm >= 9
- (Android build only) [Android Studio](https://developer.android.com/studio) + Java 17+

### Web / Development

```bash
# 1. Clone the repository
git clone https://github.com/CoreCoderX/ZenXChat.git
cd ZenXChat

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Android APK Build

```bash
# 1. Build the Next.js static export
npm run build

# 2. Sync web assets into the Android project
npx cap sync android

# 3. Open in Android Studio to build and sign the APK
npx cap open android
```

> In Android Studio: **Build → Generate Signed Bundle / APK → APK** to produce a release APK.

### Bumping the Version for a Release

Before building a release, update the version in **all** of these places (they must stay in sync):

| File | What to change | Example (v1.1.0 → v1.2.0) |
|---|---|---|
| `package.json` | `"version"` field | `"version": "1.2.0"` |
| `package-lock.json` | `"version"` in the root `""` entry (top of the file, and the `packages` → `""` block) — **not** dependency versions | `"version": "1.2.0"` |
| `android/app/build.gradle` | `versionName` and `versionCode` | `versionName "1.2.0"`, `versionCode 3` (always **increment** `versionCode`, it must never decrease) |
| `components/settings/SettingsModal.tsx` | The About section's displayed version | `Version 1.2.0` |

**One-time checks per release:**

1. `npm install` (or `npm install --package-lock-only`) to keep the lockfile's root version in sync if you changed it by hand.
2. Verify the About screen (Settings → About) and the Android launcher show the new version: `npx cap open android` → run on device, or check `versionName` under **Build → Generate Signed Bundle / APK**.
3. `versionCode` increments by 1 for each release — Android rejects installs with a lower or equal `versionCode` than what's already installed.

### Running on Device (Debug)

```bash
npx cap run android
```

---

## ⚙️ Configuration

There are no server-side environment variables. ZenXChat is a fully client-side application. All configuration (API keys, model preferences, theme) is stored in-device using `@capacitor/preferences` (persisted in the browser via `localStorage` on web).

To get started:

1. Open the app → tap the **Settings** icon in the sidebar footer
2. Navigate to **API Keys**
3. Paste your [OpenRouter API key](https://openrouter.ai/keys)
4. The key is validated live and your available models will load automatically

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| `Enter` | Send message (desktop) |
| `Shift + Enter` | Insert newline (desktop) |
| `Enter` on mobile | Insert newline |
| `Esc` | Cancel editing / close dialogs / stop generation |

---

## 📸 Screenshots

| 1. Chat Input | 2. Streaming Response | 3. Code & Preview | 4. Model Selection | 5. Settings |
|:---:|:---:|:---:|:---:|:---:|
| ![Chat Input](screenshots/prompt_page.jpeg) | ![Streaming Response](screenshots/prompt_result1.jpeg) | ![Code & Preview](screenshots/prompt_result2.jpeg) | ![Model Selection](screenshots/models.jpeg) | ![Settings](screenshots/mobile-settings.png) |

---

## 🔧 Bug Fixes & Engineering Improvements

A complete log of issues resolved and improvements made:

### Streaming & Performance
- **Enabled SSE streaming on Android** — Replaced non-streaming (full-response buffered) fetch with real SSE streaming via `XMLHttpRequest.onprogress`, eliminating the "model takes minutes to respond" issue on mobile
- **Disabled `CapacitorHttp` plugin** — `CapacitorHttp` was intercepting and buffering `fetch` requests, preventing SSE from streaming in real-time; disabling it restores native WebView `fetch` behavior
- **Smart `max_tokens` handling** — Paid models generate up to their native output limit (no hardcoded cap); `:free` models send an explicit 4096-token cap to avoid the 402 "requires more credits, or fewer max_tokens" error
- **Typewriter buffer queue** — Streaming tokens are buffered locally and flushed at 60fps with dynamic character consumption, producing smooth word-by-word text animation instead of choppy paragraph-at-a-time updates
- **AbortError handled cleanly** — Aborting a stream (Stop button) now calls `onComplete` with the partial text instead of triggering `onError`, eliminating false error messages on stop
- **`stopGeneration` cleanup** — Removed circular `require()` hack; abort chain now cleanly propagates: `abort()` → `AbortError` in reader → `onComplete(partial)`

### UI & Design
- **Conversation list sorted by `updatedAt`** — Most recently active chats now appear at the top of the sidebar
- **Dedicated confirmation dialogs** — Delete and Clear All actions use a custom modal dialog instead of the browser `confirm()` prompt
- **Sidebar active chat indicator** — Removed the green left-border style on selected conversations for a cleaner look
- **FAB theme-aware colors** — FAB background and icon correctly follow light/dark theme (white card in light, dark card in dark mode)
- **Full-screen mobile chat** — Chat area covers the full viewport width on mobile; side gaps are desktop-only
- **Clean UI layout** — Replaced floating element stack with a structured, card-based layout with consistent spacing

### Feature Enhancements

- **AI loader & reasoning UI** — Added the SmoothUI `AILoader` (dots/bar/grid variants with a shared beat and live elapsed timer) and `AIReasoning` (live trace that collapses to "Thought for Xs" with a beat); reasoning was previously never surfaced in the UI
- **Reasoning capture on all platforms** — `delta.reasoning` (plus `reasoning_content` / `reasoning_summary` fallbacks) is parsed in both the web fetch and mobile XHR stream paths, buffered and flushed during streaming, with the measured duration saved on completion
- **Friendly in-chat errors** — New `lib/errors.ts` maps 401 / 402 / 429 / 404, context-window, provider, and network failures to readable markdown messages; the full raw detail (status, model, error) is one tap behind a "!" in the error bubble
- **Side-by-side model comparison** — Two models stream the same prompt in parallel (`hooks/useCompare.ts` + `store/compareStore.ts`), each card with its own loader, reasoning, timer, and error handling; auto-archived history (reopen / delete / clear), one-tap new comparison, and "Use this response" to adopt an answer
- **Memory system** — `lib/memory.ts` prompt-driven detection, `store/memoryStore.ts` with hard caps (50 memories / 500 chars each / 10k total) and LRU eviction, ask / auto / off modes, an inline "Remember this?" confirmation card, and a management tab (edit / delete / disable)
- **Advanced generation parameters** — Temperature, top_p, top_k, max_tokens, and presence & frequency penalties wired through the request body (only non-default values are sent; free models capped at 4096)
- **AI system-prompt polishing** — `lib/polish.ts` rewrites the global system prompt with free models (candidate fallback on rate limits), with preview + Apply / Discard
- **Enhanced model categories** — `enrichModel` reads `supported_parameters`, architecture modality, and `context_length` from the Models API to auto-tag models with Reasoning, Tools, Structured, Vision, and Long Context tabs
- **Polished edit box** — Message editing upgraded from a bare textarea to a composer-style card with an auto-growing textarea and Enter / Esc keyboard shortcuts

---

## 🤝 Contributing

Contributions are welcome! To contribute:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Make your changes and commit: `git commit -m 'feat: add your feature'`
4. Push to your fork: `git push origin feature/your-feature-name`
5. Open a Pull Request against `main`

Please follow [Conventional Commits](https://www.conventionalcommits.org) for commit messages.

---

## 📄 License

MIT © 2026 [CoreCoderX](https://github.com/CoreCoderX). All rights reserved.
