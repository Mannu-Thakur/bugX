/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Leetcode-like theme tokens
        dark: {
          bg: '#0a0a0c',        // Deeper editor/app background
          panel: '#151518',     // Card / Sidebar background
          border: '#232329',    // Restrained border
          input: '#1d1d22',     // Custom input box background
          hover: '#2a2a32',     // Hover state for panels/list items
        },
        difficulty: {
          easy: '#10b981',      // Emerald Green
          medium: '#f59e0b',    // Amber Yellow
          hard: '#ef4444',      // Rose Red
        },
        status: {
          accepted: '#10b981',
          wrong: '#ef4444',
          pending: '#3b82f6',
          error: '#f97316',
        }
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'Outfit', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        'sm': '4px',
        'md': '6px',
        'lg': '8px',
        'xl': '12px',
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(59, 130, 246, 0.15)',
        'glow-success': '0 0 15px rgba(16, 185, 129, 0.15)',
      }
    },
  },
  plugins: [],
}
