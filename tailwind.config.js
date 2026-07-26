/** @type {import('tailwindcss').Config} */
const config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        // One accent, used for primary actions and active state. Muted navy
        // rather than a bright blue — this sits in front of underwriters and
        // clients, so it should read as credible rather than loud. Change it
        // here and it changes everywhere.
        brand: {
          50: "#f1f5fb",
          100: "#e2eaf6",
          200: "#c6d5ec",
          300: "#9db5dc",
          400: "#6d90c8",
          500: "#4a71b2",
          600: "#385a95",
          700: "#2e4979",
          800: "#293e65",
          900: "#22314f",
          950: "#141d30",
        },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(16 24 40 / 0.04), 0 1px 3px 0 rgb(16 24 40 / 0.06)",
        "card-hover":
          "0 4px 8px -2px rgb(16 24 40 / 0.08), 0 2px 4px -2px rgb(16 24 40 / 0.04)",
      },
    },
  },
  plugins: [],
};

module.exports = config;
