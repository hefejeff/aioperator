/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // West Monroe Brand Colors
      colors: {
        'wm-blue': '#000033',      // Grounded Blue - primary text, logos
        'wm-white': '#FFFFFF',     // White - backgrounds
        'wm-yellow': '#F2E800',    // Highlight Yellow - spotlights
        'wm-accent': '#0045FF',    // Accent Blue - subheads, links
        'wm-pink': '#F500A0',      // Accent Pink - stats, emphasis
        'wm-neutral': '#CBD2DA',   // Support Neutral - backgrounds
      },
      fontFamily: {
        'sans': ['Arial', 'sans-serif'],
      },
      keyframes: {
        'fade-in': {
            '0%': { opacity: '0' },
            '100%': { opacity: '1' },
        },
        'fade-in-up': {
            '0%': {
                opacity: '0',
                transform: 'translateY(10px)'
            },
            '100%': {
                opacity: '1',
                transform: 'translateY(0)'
            },
        },
      },
      animation: {
          'fade-in': 'fade-in 0.3s ease-out forwards',
          'fade-in-up': 'fade-in-up 0.5s ease-out forwards',
      }
    },
  },
  plugins: [],
}