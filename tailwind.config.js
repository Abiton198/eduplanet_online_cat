/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          bg: '#0A0D14',
          card: '#141822',
        },
        accent: {
          DEFAULT: '#1EA1FE',
          hover: '#4BB8FF',
        },
      },
      fontFamily: {
        zilla: ['"Zilla Slab"', 'Georgia', 'serif'],
        'plex-sans': ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        'plex-mono': ['"IBM Plex Mono"', '"Courier New"', 'monospace'],
        caveat: ['Caveat', '"Segoe Script"', 'cursive'],
      },
    },
  },
  plugins: [],
}
