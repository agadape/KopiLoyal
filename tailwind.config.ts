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
        // Design board exact values
        espresso:      "#3E2723",   // darkest — buttons, hero card
        coffee:        "#6F4E37",   // primary brown — text, icons
        brown:         "#6F4E37",   // alias kept for backward compat
        mocha:         "#8B5E3C",   // medium — secondary text
        cream:         "#EDD9C0",   // borders, dividers
        latte:         "#F5E9DC",   // card backgrounds
        "latte-light": "#FAF6F0",   // app background
        gold:          "#D4A017",   // points coin accent
        "earn-green":  "#2E7D32",   // positive amounts
        "earn-light":  "#E8F5E9",   // earn badge background
        "red-soft":    "#FFEBEE",   // disconnect / error bg
        "red-text":    "#C62828",   // disconnect / error text
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "2xs": ["11px", "16px"],
        xs:    ["12px", "18px"],
        sm:    ["13px", "20px"],
        base:  ["14px", "22px"],
        lg:    ["16px", "24px"],
        xl:    ["18px", "28px"],
        "2xl": ["22px", "32px"],
        "3xl": ["28px", "36px"],
        "4xl": ["32px", "40px"],
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem",
      },
      boxShadow: {
        card:  "0 2px 12px rgba(62,39,35,0.08)",
        float: "0 4px 24px rgba(62,39,35,0.14)",
        hero:  "0 8px 32px rgba(62,39,35,0.20)",
      },
    },
  },
  plugins: [],
};

export default config;
