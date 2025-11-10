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
    },
  },
  plugins: [],
}
