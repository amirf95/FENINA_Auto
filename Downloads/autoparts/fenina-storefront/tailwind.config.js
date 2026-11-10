/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: "#1A1A2E",
        workshop: "#F5C518",
        cream: "#FAFAF7",
        steel: "#6B7280",
        haze: "#E8E6E1",
        garage: "#2D5F4C",
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      animation: {
        "fade-in-up": "fadeInUp 0.8s ease-out both",
        "fade-in": "fadeIn 0.8s ease-out both",
        "slide-in-left": "slideInLeft 0.8s ease-out both",
        "slide-in-right": "slideInRight 0.8s ease-out both",
        "float": "float 6s ease-in-out infinite",
        "scroll-left": "scrollLeft 40s linear infinite",
        "scroll-right": "scrollRight 40s linear infinite",
        "spin-slow": "spin 30s linear infinite",
        "pulse-slow": "pulse 3s ease-in-out infinite",
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(40px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideInLeft: {
          "0%": { opacity: "0", transform: "translateX(-40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(40px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-18px)" },
        },
        scrollLeft: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
        scrollRight: {
          "0%": { transform: "translateX(-50%)" },
          "100%": { transform: "translateX(0)" },
        },
      },
    },
  },
  plugins: [],
};
