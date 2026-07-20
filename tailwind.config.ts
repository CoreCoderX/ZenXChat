import type { Config } from "tailwindcss";

const config: Config = {
  // Class-based dark mode
  darkMode: "class",

  // Tell Tailwind where to scan for class names
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./store/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        // Light mode surfaces
        surface: {
          DEFAULT: "#f8fafc",     // slate-50
          secondary: "#f1f5f9",   // slate-100
          tertiary: "#e2e8f0",    // slate-200
          border: "#cbd5e1",      // slate-300
        },
        // Dark mode surfaces (reverted from blue-black)
        dark: {
          DEFAULT: "#0a0a0a",
          secondary: "#111111",
          tertiary: "#1a1a1a",
          quaternary: "#222222",
          border: "#2a2a2a",
        },
        // High contrast text shades
        ink: {
          DEFAULT: "#0f172a",     // slate-900 (light primary text)
          secondary: "#334155",   // slate-700 (light secondary text)
          tertiary: "#475569",    // slate-600
          muted: "#64748b",       // slate-500
        },
      },

      fontFamily: {
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },

      animation: {
        "fade-in": "fadeIn 0.2s ease-out",
        "slide-in": "slideIn 0.3s ease-out",
        shimmer: "shimmer 1.5s infinite",
        "pulse-dot": "pulseDot 1.4s infinite ease-in-out",
      },

      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        slideIn: {
          from: { opacity: "0", transform: "translateX(-12px)" },
          to: { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseDot: {
          "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" },
          "40%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },

  plugins: [],
};

export default config;
