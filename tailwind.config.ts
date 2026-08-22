import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        base: "#0A0D12",
        panel: "#11151C",
        raised: "#161B24",
        hairline: "#232A35",
        ink: "#E7ECF2",
        muted: "#8992A3",
        faint: "#57606F",
        accent: {
          DEFAULT: "#6E5BFF",
          soft: "#241F45",
          bright: "#8B7CFF",
        },
        teal: {
          DEFAULT: "#29D3C2",
          soft: "#122A28",
        },
        amber: {
          DEFAULT: "#F5A65B",
          soft: "#2B2013",
        },
        danger: "#FF6B6B",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        body: ["var(--font-body)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      boxShadow: {
        glow: "0 0 0 1px rgba(110,91,255,0.4), 0 0 24px -4px rgba(110,91,255,0.45)",
        panel: "0 1px 0 0 rgba(255,255,255,0.02) inset",
      },
      keyframes: {
        "pulse-bar": {
          "0%, 100%": { transform: "scaleY(0.3)", opacity: "0.5" },
          "50%": { transform: "scaleY(1)", opacity: "1" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        "pulse-bar": "pulse-bar 0.9s ease-in-out infinite",
        "fade-up": "fade-up 0.25s ease-out",
        shimmer: "shimmer 2.2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
