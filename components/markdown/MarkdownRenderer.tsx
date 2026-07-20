"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Components } from "react-markdown";
import CodeBlock from "./CodeBlock";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isStreaming?: boolean;
}

export default function MarkdownRenderer({
  content,
  className,
  isStreaming = false,
}: MarkdownRendererProps) {
  const components: Components = {
    // ── Code blocks and inline code ─────────────────────────
    code({ className: cls, children, ...props }) {
      const match = /language-(\w+)/.exec(cls ?? "");
      const lang = match ? match[1] : "";

      // Stringify children safely — never pass React nodes as-is
      const rawCode = Array.isArray(children)
        ? children.map((c) => (typeof c === "string" ? c : "")).join("")
        : typeof children === "string"
          ? children
          : "";

      const code = rawCode.replace(/\n$/, "");

      // Block code — has a language class or contains newlines
      const isBlock = !!match || code.includes("\n");

      if (isBlock) {
        return <CodeBlock code={code} language={lang} isStreaming={isStreaming} />;
      }

      // Inline code
      return (
        <code
          className="bg-neutral-100 dark:bg-dark-tertiary text-neutral-800 dark:text-neutral-200 px-1.5 py-0.5 rounded text-xs font-mono"
          {...props}
        >
          {code}
        </code>
      );
    },

    // ── Paragraphs ──────────────────────────────────────────
    p({ children }) {
      return <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>;
    },

    // ── Headings ────────────────────────────────────────────
    h1({ children }) {
      return (
        <h1 className="text-xl font-semibold mt-5 mb-2 text-ink dark:text-neutral-50">
          {children}
        </h1>
      );
    },
    h2({ children }) {
      return (
        <h2 className="text-lg font-semibold mt-4 mb-2 text-ink dark:text-neutral-50">
          {children}
        </h2>
      );
    },
    h3({ children }) {
      return (
        <h3 className="text-base font-semibold mt-3 mb-1.5 text-ink dark:text-neutral-50">
          {children}
        </h3>
      );
    },
    h4({ children }) {
      return (
        <h4 className="text-sm font-semibold mt-3 mb-1 text-ink dark:text-neutral-50">
          {children}
        </h4>
      );
    },

    // ── Lists ───────────────────────────────────────────────
    ul({ children }) {
      return <ul className="list-disc pl-5 mb-3 space-y-1">{children}</ul>;
    },
    ol({ children }) {
      return <ol className="list-decimal pl-5 mb-3 space-y-1">{children}</ol>;
    },
    li({ children }) {
      return <li className="leading-relaxed">{children}</li>;
    },

    // ── Blockquote ──────────────────────────────────────────
    blockquote({ children }) {
      return (
        <blockquote className="border-l-2 border-neutral-300 dark:border-neutral-600 pl-3 my-3 text-ink-secondary dark:text-neutral-400 italic">
          {children}
        </blockquote>
      );
    },

    // ── Horizontal rule ─────────────────────────────────────
    hr() {
      return <hr className="border-neutral-200 dark:border-dark-border my-4" />;
    },

    // ── Strong / Em ─────────────────────────────────────────
    strong({ children }) {
      return (
        <strong className="font-semibold text-ink dark:text-neutral-50">
          {children}
        </strong>
      );
    },
    em({ children }) {
      return <em className="italic">{children}</em>;
    },

    // ── Links ───────────────────────────────────────────────
    a({ href, children }) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-neutral-600 dark:text-neutral-300 underline underline-offset-2 hover:text-ink dark:hover:text-white transition-colors"
        >
          {children}
        </a>
      );
    },

    // ── Tables ──────────────────────────────────────────────
    table({ children }) {
      return (
        <div className="overflow-x-auto my-3 rounded-xl border border-neutral-200 dark:border-dark-border">
          <table className="w-full border-collapse text-sm">{children}</table>
        </div>
      );
    },
    thead({ children }) {
      return (
        <thead className="bg-neutral-50 dark:bg-dark-tertiary">
          {children}
        </thead>
      );
    },
    tbody({ children }) {
      return <tbody>{children}</tbody>;
    },
    tr({ children }) {
      return (
        <tr className="border-b border-neutral-200 dark:border-dark-border last:border-0 hover:bg-neutral-50 dark:hover:bg-dark-tertiary/50 transition-colors">
          {children}
        </tr>
      );
    },
    th({ children }) {
      return (
        <th className="px-3 py-2.5 text-left text-xs font-semibold text-ink dark:text-neutral-200 border-r border-neutral-200 dark:border-dark-border last:border-0">
          {children}
        </th>
      );
    },
    td({ children }) {
      return (
        <td className="px-3 py-2 text-xs text-ink-secondary dark:text-neutral-300 border-r border-neutral-200 dark:border-dark-border last:border-0">
          {children}
        </td>
      );
    },

    // ── Pre — wrapper for code blocks ────────────────────────
    // Override pre so react-markdown doesn't wrap our CodeBlock in a <pre>
    pre({ children }) {
      return <>{children}</>;
    },
  };

  return (
    <div className={cn("markdown-body", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        components={components}
        // Disable rehype-highlight here — we do it manually in CodeBlock
        // to avoid the [object Object] serialization bug
      >
        {content}
      </ReactMarkdown>

      {/* Blinking cursor while streaming */}
      {isStreaming && (
        <span className="inline-block w-0.5 h-3.5 bg-current animate-pulse ml-0.5 align-middle" />
      )}
    </div>
  );
}
