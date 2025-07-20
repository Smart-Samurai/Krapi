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
        'text': {
          50: 'var(--text-50)',
          100: 'var(--text-100)',
          200: 'var(--text-200)',
          300: 'var(--text-300)',
          400: 'var(--text-400)',
          500: 'var(--text-500)',
          600: 'var(--text-600)',
          700: 'var(--text-700)',
          800: 'var(--text-800)',
          900: 'var(--text-900)',
          950: 'var(--text-950)',
        },




        // Legacy support for existing components
        background: "var(--background-50)",
        foreground: "var(--text-900)",
        card: {
          DEFAULT: "var(--background-100)",
          foreground: "var(--text-900)",
        },
        popover: {
          DEFAULT: "var(--background-100)",
          foreground: "var(--text-900)",
        },
        muted: {
          DEFAULT: "var(--background-200)",
          foreground: "var(--text-600)",
        },
        destructive: {
          DEFAULT: "#ef4444",
          foreground: "#ffffff",
        },
        border: "var(--background-300)",
        input: "var(--background-200)",
        ring: "var(--primary-500)",
        sidebar: {
          DEFAULT: "var(--background-100)",
          foreground: "var(--text-900)",
          primary: "var(--primary-500)",
          "primary-foreground": "var(--text-50)",
          accent: "var(--accent-500)",
          "accent-foreground": "var(--text-50)",
          border: "var(--background-300)",
          ring: "var(--primary-500)",
        },
      },
      fontSize: {
        sm: '0.750rem',
        base: '1rem',
        xl: '1.333rem',
        '2xl': '1.777rem',
        '3xl': '2.369rem',
        '4xl': '3.158rem',
        '5xl': '4.210rem',
      },
      fontFamily: {
        heading: 'Bricolage Grotesque',
        body: 'Bricolage Grotesque',
      },
      fontWeight: {
        normal: '400',
        bold: '700',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
} satisfies Config;
