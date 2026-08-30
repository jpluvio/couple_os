/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./hooks/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Direzione editoriale calda. Sostituisce i sette accenti scorrelati
        // (uno per tab) con un accento solo e due colori partner.
        paper:  "#faf7f2",  // sfondo
        card:   "#ffffff",
        line:   "#ece4d9",  // bordi
        hair:   "#f5efe6",  // separatori interni
        ink:    "#1a1714",  // testo primario
        muted:  "#8a7f74",  // testo secondario
        soft:   "#a49a8e",  // testo terziario
        accent: "#a8562e",  // terracotta
        tint:   "#f2ece2",  // fondo dell'accento
        paolo:  "#a8562e",
        giulia: "#4a6b63",
        ok:     "#166534",
        warn:   "#c2410c",
        bad:    "#b91c1c",
      },
      fontFamily: {
        sans:    ["Public Sans", "system-ui", "sans-serif"],
        display: ["Newsreader", "Georgia", "serif"],
      },
      borderRadius: {
        // Angoli netti: è una scelta della direzione, non un default.
        DEFAULT: "4px",
        card: "4px",
        pill: "2px",
      },
    },
  },
  plugins: [],
};
