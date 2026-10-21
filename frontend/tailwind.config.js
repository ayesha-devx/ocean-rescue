/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ocean: {
          main: '#061522',
          bg: '#061522',
          sidebar: '#071D33',
          nav: '#071D33',
          card: '#0B2638',
          surface: '#103B50',
          elevated: '#103B50',
          border: '#16465A',
          cyan: '#00E5FF',
          aqua: '#75E6DA',
          teal: '#00D6A3',
          textPrimary: '#EAF6FF',
          textSecondary: '#91A9BB',
          riskHigh: '#FF6B61',
          riskMed: '#FFB547',
          info: '#4C9AFF',
          review: '#B8A4FF'
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      }
    },
  },
  plugins: [],
};
