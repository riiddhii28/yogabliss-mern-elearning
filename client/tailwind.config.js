/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f3f6f4",
          100: "#e0ebe4",
          400: "#6aa887",
          500: "#4e8f6d",
          600: "#3d7457",
          700: "#325d47",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
