import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        "neu-bg": "#e0e5ec",
        "neu-dark": "#a3b1c6",
        "neu-light": "#ffffff",
        "status-ok": "#4CAF50",
        "status-nok": "#F44336",
      },
      borderRadius: {
        neu: "20px",
        "neu-lg": "30px",
      },
      boxShadow: {
        "neu-flat": "6px 6px 12px #b8bec7, -6px -6px 12px #ffffff",
        "neu-pressed":
          "inset 4px 4px 8px #b8bec7, inset -4px -4px 8px #ffffff",
        "neu-concave":
          "inset 3px 3px 7px #b8bec7, inset -3px -3px 7px #ffffff",
        "neu-convex": "3px 3px 7px #b8bec7, -3px -3px 7px #ffffff",
      },
      fontFamily: {
        inter: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
