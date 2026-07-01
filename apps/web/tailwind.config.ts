import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#09090b",
        surface: {
          DEFAULT: "#111113",
          raised: "#18181b",
          hover: "#1e1e22"
        },
        border: {
          DEFAULT: "#232327",
          strong: "#2e2e33"
        },
        ink: {
          DEFAULT: "#e4e4e7",
          muted: "#9a9aa2",
          subtle: "#5f5f68"
        },
        accent: {
          DEFAULT: "#5865f2",
          hover: "#4752e6",
          foreground: "#ffffff",
          soft: "rgba(88, 101, 242, 0.12)"
        }
      },
      borderRadius: {
        md: "8px",
        lg: "10px"
      }
    }
  },
  plugins: []
};

export default config;
