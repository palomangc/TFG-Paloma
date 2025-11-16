/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,ts}"],
  theme: {
    extend: {
      colors: {
        azulmarino: '#0a1931',
        ocre: '#b88900',
      },
      fontFamily: {
        cinzel: ['"Cinzel"', 'serif'],
      },
      keyframes: {
        fadeZoom: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(20px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        fadeZoom: "fadeZoom 1.2s ease-out forwards",
        fadeUp: "fadeUp 1s ease-out forwards",
      },
      },
      },
  plugins: [],
}
