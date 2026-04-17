/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // BlockBid / Mercurry Tender brand colors
        'cloud-white': '#FFFFFF',
        'xp-sky-blue': '#3B82F6',
        'digital-navy': '#1E246A',
        'soft-sand': '#F5F5F5',
        'pixel-grey': '#15C5AF',
        'sunset-orange': '#F52516',

        // Legacy brand colors (backwards compatibility)
        'arctic-white': '#FFFFFF',
        'granite-grey': '#2E2E2E',
        'nordic-blue': '#1A3D5D',
        'slate-grey': '#707070',
        'silver-mist': '#E6E6E6',
        'emerald-green': '#2F6F4E',
        'deep-orange': '#D95F0E',
        'hint-green': '#10B981',
        'pastel-yellow': '#FACC15',

        // shadcn CSS-variabel farvemapping
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
      },
      fontSize: {
        'h1': ['40px', { lineHeight: '1.2', fontWeight: '700' }],
        'h2': ['28px', { lineHeight: '1.3', fontWeight: '500' }],
        'h3': ['20px', { lineHeight: '1.4', fontWeight: '600' }],
        'h4': ['18px', { lineHeight: '1.4', fontWeight: '600' }],
        'body': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
      },
      fontFamily: {
        'space': ['var(--font-space-grotesk)', 'system-ui', 'sans-serif'],
        'inter': ['var(--font-inter)', 'system-ui', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'xp': '12px',
        'xp-lg': '16px',
        'xp-xl': '20px',
      },
      boxShadow: {
        'blockbid': '0 2px 4px rgba(59, 130, 246, 0.1), 0 1px 2px rgba(30, 58, 138, 0.06)',
        'blockbid-lg': '0 10px 20px rgba(59, 130, 246, 0.15), 0 4px 8px rgba(30, 58, 138, 0.1)',
        'blockbid-xl': '0 20px 40px rgba(59, 130, 246, 0.2), 0 8px 16px rgba(30, 58, 138, 0.15)',
        'xp-soft': '0 4px 12px rgba(59, 130, 246, 0.12)',
        'xp-button': 'inset 0 -2px 0 rgba(0, 0, 0, 0.1), 0 2px 4px rgba(59, 130, 246, 0.15)',
      },
      backgroundImage: {
        'xp-gradient': 'linear-gradient(180deg, #3B82F6 0%, #2563EB 100%)',
        'xp-sky': 'linear-gradient(180deg, #3B82F6 0%, #60A5FA 50%, #FFFFFF 100%)',
        'xp-button': 'linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'float': 'float 3s ease-in-out infinite',
        'slide-up': 'slideUp 0.4s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
