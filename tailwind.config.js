/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pode trazer as cores do seu style.css atual
        dark: "#121829",
        card: "#1e293b",
      }
    },
  },
  plugins: [],
}