/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Inter",
          "Geist",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      colors: {
        brand: {
          bg: "#F4EEE8",
          surface: "#FFFFFF",
          primary: "#2DD4BF",
          "primary-dark": "#14B8A6",
          "primary-light": "#CCFBF1",
          secondary: "#8B5CF6",
          "secondary-light": "#EDE9FE",
          text: "#111111",
          muted: "#6B7280",
          border: "#E5E7EB",
          chip: "#F8FAFC",
          "chip-hover": "#F1F5F9",
        },
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "18px",
        xl: "24px",
        pill: "9999px",
      },
      boxShadow: {
        card: "0 8px 24px rgba(0,0,0,0.06)",
        "card-hover": "0 12px 32px rgba(0,0,0,0.10)",
        input: "0 2px 8px rgba(0,0,0,0.04)",
        "input-focus": "0 0 0 3px rgba(45,212,191,0.25)",
      },
      spacing: {
        "section-sm": "3.5rem",
        "section-md": "5.5rem",
      },
      transitionDuration: {
        fast: "150ms",
        normal: "220ms",
        panel: "320ms",
      },
      transitionTimingFunction: {
        panel: "cubic-bezier(0.2, 0.8, 0.2, 1)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(12px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.96)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 300ms ease-out forwards",
        "fade-in": "fade-in 250ms ease-out forwards",
        "scale-in": "scale-in 220ms ease-out forwards",
        float: "float 4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
