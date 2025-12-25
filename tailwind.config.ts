import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          paper: '#F4F1EA',    // The physical menu paper color
          black: '#1A1A1A',    // High contrast text
          gold: '#C6A87C',     // Accents
          wood: '#4A3B2A',     // Deep brown
          gray: '#8C8C8C',     // Subtitles
        },
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'serif'], // Ensure you load a serif font in layout.tsx
        sans: ['var(--font-sans)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;