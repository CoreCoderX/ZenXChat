import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ZenXChat — AI Chat powered by OpenRouter",
  description:
    "A minimal, modern AI chat interface. Access 200+ models including Claude, GPT-4, Gemini, Llama and more — all from one place.",
  keywords: [
    "AI chat",
    "OpenRouter",
    "Claude",
    "GPT-4",
    "Gemini",
    "Llama",
    "free AI",
    "chat app",
    "AI assistant",
  ],
  authors: [{ name: "Sivaprakash", url: "https://github.com/CoreCoderX" }],
  creator: "Sivaprakash",
  openGraph: {
    title: "ZenXChat — AI Chat powered by OpenRouter",
    description:
      "Access 200+ AI models from one minimal interface. Free tier available.",
    url: "https://github.com/yourusername/ZenXChat",
    siteName: "ZenXChat",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ZenXChat — AI Chat powered by OpenRouter",
    description: "Access 200+ AI models from one minimal interface.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=JSON.parse(localStorage.getItem('openrouter-settings')||'{}');var t=s.state?.theme||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
