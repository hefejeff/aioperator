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
        'wm-neutral': '#5F7390',   // Support Neutral - punchier contrast for borders/backgrounds
      },
      fontFamily: {
        'sans': ['Arial', 'sans-serif'],
      },
      fontSize: {
        sm: ['0.95rem', { lineHeight: '1.4rem' }],
      },
      boxShadow: {
        sm: '0 3px 10px rgb(0 0 34 / 0.14), 0 1px 4px rgb(0 0 34 / 0.10)',
        md: '0 10px 24px rgb(0 0 34 / 0.16), 0 3px 10px rgb(0 0 34 / 0.12)',
        lg: '0 18px 36px rgb(0 0 34 / 0.18), 0 6px 16px rgb(0 0 34 / 0.14)',
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