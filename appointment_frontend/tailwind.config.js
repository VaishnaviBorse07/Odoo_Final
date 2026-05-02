/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        zen: {
          primary: '#0F6E56',
          secondary: '#E1F5EE',
          accent: '#1D9E75',
          error: '#E24B4A',
          warning: '#EF9F27',
          ink: '#111827',
          muted: '#6B7280'
        }
      },
      fontFamily: {
        sans: ['Nunito', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        card: '16px',
        control: '12px'
      }
    }
  },
  plugins: []
};
