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
        'wm-blue': '#000022',      // Grounded Blue - primary text, logos (higher contrast)
        'wm-white': '#FFFFFF',     // White - backgrounds
        'wm-yellow': '#E8DF00',    // Highlight Yellow - spotlights (slightly deeper)
        'wm-accent': '#0036CC',    // Accent Blue - subheads, links (higher contrast)
        'wm-pink': '#F500A0',      // Accent Pink - stats, emphasis
        'wm-neutral': '#A9B5C4',   // Support Neutral - borders/background support (higher contrast)
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