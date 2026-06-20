import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#18181b",
        panel: "#f8fafc",
        line: "#d4d4d8",
        action: "#0f766e",
        accent: "#f59e0b"
      }
    }
  },
  plugins: []
};

export default config;
