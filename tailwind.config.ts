import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        barlow: ["'Barlow'", "sans-serif"],
        condensed: ["'Barlow Condensed'", "sans-serif"],
      },
      colors: {
        "ev-green": "#7cc242",
        "ev-green-dark": "#5a9e2f",
        "ev-teal": "#1a7080",
        "ev-teal-dark": "#0d4e5a",
      },
    },
  },
  plugins: [],
};

export default config;
