/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: "#121829",      // Fundo principal original
        card: "#1e293b",      // Fundo de cards e sidebar
        input: "#2d3748",     // Fundo de inputs
        accent: "#6366f1",    // Roxo principal
      },
      fontFamily: {
        sans: ['Poppins', 'sans-serif'], // Fonte usada no original
      }
    },
  },
  plugins: [],
}