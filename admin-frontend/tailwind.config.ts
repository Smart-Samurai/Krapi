import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        background: {
          DEFAULT: "var(--background)",
          50: "var(--background-50)",
          100: "var(--background-100)",
          200: "var(--background-200)",
          300: "var(--background-300)",
          400: "var(--background-400)",
          500: "var(--background-500)",
          600: "var(--background-600)",
          700: "var(--background-700)",
          800: "var(--background-800)",
          900: "var(--background-900)",
          secondary: "var(--background-secondary)",
          tertiary: "var(--background-tertiary)",
        },
        primary: "var(--primary)",
        "primary-hover": "var(--primary-hover)",
        secondary: "var(--secondary)",
        "secondary-hover": "var(--secondary-hover)",
        accent: "var(--accent)",
        "accent-hover": "var(--accent-hover)",
        border: "var(--border)",
        "border-hover": "var(--border-hover)",
        success: "var(--success)",
        error: "var(--error)",
        warning: "var(--warning)",
      },
    },
  },
  plugins: [],
} satisfies Config;
