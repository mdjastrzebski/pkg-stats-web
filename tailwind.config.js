/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'brutal': ['Space Grotesk', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      colors: {
        'brutal-purple': {
          DEFAULT: '#A750F0',
          '300': '#A750F0',
          '200': '#C084FC',
        },
      },
    },
  },
  plugins: [],
}
