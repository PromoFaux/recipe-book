import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#fef7ee",
          100: "#fdedd6",
          200: "#fad7ac",
          300: "#f6ba77",
          400: "#f19340",
          500: "#ed7519",
          600: "#de5c0f",
          700: "#b8440f",
          800: "#933614",
          900: "#772f13",
          950: "#401508",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
} satisfies Config;
