"use client";

import { useEffect, useRef, useState } from "react";
import { FileCode2 } from "lucide-react";

interface LivePreviewProps {
  content: string;
  language?: string;
}

function buildHtml(content: string, language: string): string {
  if (!content.trim()) return "";

  const isFullDoc =
    content.trim().toLowerCase().startsWith("<!doctype") ||
    content.trim().toLowerCase().startsWith("<html");

  if (isFullDoc) return content;

  if (language === "css") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    body{font-family:-apple-system,sans-serif;padding:2rem;margin:0;}
  </style>
  <style>${content}</style>
</head>
<body>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <p>Paragraph of text to preview styles.</p>
  <button>Button</button>
  <a href="#">Link</a>
  <ul><li>Item one</li><li>Item two</li><li>Item three</li></ul>
  <input type="text" placeholder="Input field">
</body>
</html>`;
  }

  if (language === "javascript" || language === "js") {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    *{box-sizing:border-box;}
    body{font-family:-apple-system,sans-serif;padding:1rem;
         margin:0;background:#fafafa;font-size:14px;}
    #out{background:#fff;border:1px solid #e5e5e5;border-radius:8px;
         padding:1rem;margin-top:.5rem;min-height:48px;
         white-space:pre-wrap;font-family:monospace;font-size:13px;}
    .err{color:#dc2626;}
    label{font-size:11px;color:#888;}
  </style>
</head>
<body>
  <label>Console output</label>
  <div id="out"></div>
  <script>
    const out=document.getElementById('out');
    const _l=console.log.bind(console);
    const _e=console.error.bind(console);
    console.log=(...a)=>{
      const d=document.createElement('div');
      d.textContent=a.map(x=>typeof x==='object'
        ?JSON.stringify(x,null,2):String(x)).join(' ');
      out.appendChild(d);_l(...a);
    };
    console.error=(...a)=>{
      const d=document.createElement('div');
      d.className='err';d.textContent=a.join(' ');
      out.appendChild(d);_e(...a);
    };
    try{${content}}
    catch(e){
      const d=document.createElement('div');
      d.className='err';d.textContent='Error: '+e.message;
      out.appendChild(d);
    }
  </script>
</body>
</html>`;
  }

  // HTML snippet
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    *{box-sizing:border-box;}
    body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
         padding:1rem;margin:0;font-size:14px;line-height:1.6;color:#111;}
  </style>
</head>
<body>${content}</body>
</html>`;
}

export default function LivePreview({
  content,
  language = "html",
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const [errMsg, setErrMsg] = useState("");

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    setErrMsg("");
    setReady(false);

    const html = buildHtml(content, language);
    if (!html) {
      setReady(true);
      return;
    }

    // srcdoc is the most reliable cross-browser way to inject HTML
    iframe.srcdoc = html;
  }, [content, language]);

  if (!content) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          width: "100%",
          gap: "12px",
          padding: "24px",
          textAlign: "center",
        }}
        className="text-ink-tertiary dark:text-neutral-500"
      >
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            border: "2px dashed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          className="border-neutral-200 dark:border-dark-border"
        >
          <FileCode2 className="size-6 text-neutral-400 dark:text-neutral-600" />
        </div>
        <div>
          <p className="text-sm font-medium">No preview yet</p>
          <p className="text-xs opacity-60 mt-1">
            Click <strong>Preview</strong> on an HTML, CSS, or JS code block
          </p>
        </div>
      </div>
    );
  }

  if (errMsg) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          padding: "24px",
        }}
        className="text-red-500 text-sm text-center"
      >
        {errMsg}
      </div>
    );
  }

  return (
    /*
      This wrapper MUST be 100% width + height.
      The iframe inside must also be 100% x 100%.
      No padding, no margin, no border on the wrapper.
    */
    <div
      style={{
        width: "100%",
        height: "100%",
        minHeight: 0,
        position: "relative",
        overflow: "hidden",
        background: "#ffffff",
      }}
    >
      {/* Spinner until iframe fires onLoad */}
      {!ready && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#fff",
            zIndex: 1,
          }}
        >
          <div
            style={{
              width: 20,
              height: 20,
              border: "2px solid #d4d4d4",
              borderTopColor: "#404040",
              borderRadius: "50%",
              animation: "spin 0.7s linear infinite",
            }}
          />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      <iframe
        ref={iframeRef}
        title="Live Preview"
        onLoad={() => setReady(true)}
        onError={() => setErrMsg("Failed to load preview")}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
        style={{
          // These four lines are critical — iframe must fill 100%
          display: "block",
          width: "100%",
          height: "100%",
          border: "none",
          // Visibility hidden until loaded (prevents white flash)
          opacity: ready ? 1 : 0,
          transition: "opacity 0.15s",
        }}
      />
    </div>
  );
}
