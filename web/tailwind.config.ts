import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#7C83FD",
          muted: "#C7D2FE",
          dark: "#5158E0"
        },
        echoBlue: "#7C83FD",
        echoLavender: "#C7D2FE",
        echoDark: "#0F111A"
      },
      boxShadow: {
        glow: "0 0 20px rgba(124,131,253,0.6)",
        "glow-soft": "0 0 40px rgba(124,131,253,0.25)"
      },
      keyframes: {
        fadeIn: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" }
        },
        glowPulse: {
          "0%": { boxShadow: "0 0 10px rgba(124,131,253,0.3)" },
          "50%": { boxShadow: "0 0 20px rgba(124,131,253,0.6)" },
          "100%": { boxShadow: "0 0 10px rgba(124,131,253,0.3)" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-8px)" }
        }
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-in-out",
        "glow-pulse": "glowPulse 3s ease-in-out infinite",
        float: "float 6s ease-in-out infinite"
      }
    }
  },
  plugins: []
};

export default config;
