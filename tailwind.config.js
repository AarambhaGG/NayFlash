/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: "#00d4ff",
          dim: "#00a3c7",
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
        surface: {
          DEFAULT: "#09090b",
          50: "#18181b",
          100: "#131316",
          200: "#0e0e11",
          300: "#09090b",
        },
      },
      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
      boxShadow: {
        glow: '0 0 20px rgba(0, 212, 255, 0.15)',
        'glow-sm': '0 0 10px rgba(0, 212, 255, 0.1)',
        'glow-lg': '0 0 40px rgba(0, 212, 255, 0.2)',
        'inner-glow': 'inset 0 0 20px rgba(0, 212, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
