/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#47689dff", // Blue from the image
        background: "#f4f5f7", // Light gray background
        surface: "#ffffff", // Pure white for cards
        text: {
          main: "#111827",
          subtle: "#6b7280"
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'], // Professional font
      }
    },
  },
  plugins: [],
}
