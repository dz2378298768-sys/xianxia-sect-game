/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        sect: {
          ink: "#1a2e2a",
          "ink-light": "#2a4a42",
          "ink-dark": "#0f1c1a",
          gold: "#d4a857",
          "gold-light": "#e8c77a",
          "gold-dark": "#b8913e",
          jade: "#e8e4d9",
          "jade-dark": "#c9c4b5",
          spirit: "#9b7ed4",
          "spirit-light": "#b9a3e8",
          herb: "#5a8a6a",
          "herb-light": "#7ab08a",
          pill: "#c26a4a",
          "pill-light": "#d98a6a",
        },
      },
      fontFamily: {
        display: ["'LXGW WenKai'", "'Noto Serif SC'", "serif"],
        body: ["'Noto Serif SC'", "'Source Han Serif SC'", "serif"],
      },
      boxShadow: {
        gold: "0 0 20px rgba(212, 168, 87, 0.3)",
        "gold-hover": "0 0 30px rgba(212, 168, 87, 0.5)",
        spirit: "0 0 20px rgba(155, 126, 212, 0.3)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "float": "float 3s ease-in-out infinite",
        "glow": "glow 2s ease-in-out infinite alternate",
        "scroll-unfold": "scrollUnfold 0.6s ease-out forwards",
        "modal-fade-in": "modalFadeIn 0.25s ease-out forwards",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        glow: {
          "0%": { boxShadow: "0 0 5px rgba(212, 168, 87, 0.3)" },
          "100%": { boxShadow: "0 0 20px rgba(212, 168, 87, 0.6)" },
        },
        scrollUnfold: {
          "0%": { transform: "scaleY(0)", opacity: "0" },
          "100%": { transform: "scaleY(1)", opacity: "1" },
        },
        // 居中淡入：从顶部拉取改为居中缩放淡入，避免下方建筑弹窗从上拉取的违和感
        modalFadeIn: {
          "0%": { transform: "scale(0.96)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
      },
    },
  },
  plugins: [],
};
