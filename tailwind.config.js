/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}", // <-- ده السطر اللي بيقوله يدور على الكود فين
  ],
  theme: {
    extend: {
      // دي الإعدادات اللي كانت في ملف الـ HTML القديم
      colors: {
        'brand-pink': {
          light: '#FFF0F5',
          DEFAULT: '#FF69B4',
          dark: '#C71585',
        },
        'brand-white': '#FFFFFF',
        'brand-gray': {
          light: '#F3F4F6',
          DEFAULT: '#6B7280',
          dark: '#1F2937',
        }
      },
      fontFamily: {
        sans: ['Tajawal', 'sans-serif'],
      },
    },
  },
  plugins: [],
}