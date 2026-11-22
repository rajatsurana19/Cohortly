/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#F7F8FA',
        surface: '#FFFFFF',
        primary: {
          DEFAULT: '#2563EB',
          hover: '#1D4ED8',
          light: '#EFF6FF',
        },
        text: {
          primary: '#171717',
          secondary: '#666B75',
          muted: '#9CA3AF',
        },
        border: '#E5E7EB',
        success: '#15803D',
        warning: '#B45309',
        danger: '#DC2626',
      },
    },
  },
  plugins: [],
}
