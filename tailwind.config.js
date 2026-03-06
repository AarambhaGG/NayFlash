/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#00d4ff",
          50: "#e6fbff",
          100: "#b3f3ff",
          200: "#80ebff",
          300: "#4de3ff",
          400: "#1adbff",
          500: "#00d4ff",
          600: "#00a8cc",
          700: "#007d99",
          800: "#005266",
          900: "#002733",
        },
        dark: {
          DEFAULT: "#0f1117",
          50: "#1a1d27",
          100: "#141620",
          200: "#0f1117",
          300: "#0a0c10",
          400: "#050608",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
