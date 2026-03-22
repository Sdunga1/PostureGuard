/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
      './pages/**/*.{js,jsx}',
      './components/**/*.{js,jsx}',
      './app/**/*.{js,jsx}',
      './src/**/*.{js,jsx}',
    ],
    prefix: "",
    theme: {
        container: {
                center: true,
                padding: '2rem',
                screens: {
                        '2xl': '1400px'
                }
        },
        extend: {
                fontFamily: {
                        headline: ['Space Grotesk', 'sans-serif'],
                        body: ['Inter', 'sans-serif'],
                        label: ['Space Grotesk', 'sans-serif'],
                },
                colors: {
                        border: 'hsl(var(--border))',
                        input: 'hsl(var(--input))',
                        ring: 'hsl(var(--ring))',
                        background: 'hsl(var(--background))',
                        foreground: 'hsl(var(--foreground))',
                        primary: {
                                DEFAULT: '#4CD7F6',
                                foreground: '#050505'
                        },
                        secondary: {
                                DEFAULT: 'hsl(var(--secondary))',
                                foreground: 'hsl(var(--secondary-foreground))'
                        },
                        destructive: {
                                DEFAULT: 'hsl(var(--destructive))',
                                foreground: 'hsl(var(--destructive-foreground))'
                        },
                        muted: {
                                DEFAULT: 'hsl(var(--muted))',
                                foreground: 'hsl(var(--muted-foreground))'
                        },
                        accent: {
                                DEFAULT: 'hsl(var(--accent))',
                                foreground: 'hsl(var(--accent-foreground))'
                        },
                        popover: {
                                DEFAULT: 'hsl(var(--popover))',
                                foreground: 'hsl(var(--popover-foreground))'
                        },
                        card: {
                                DEFAULT: 'hsl(var(--card))',
                                foreground: 'hsl(var(--card-foreground))'
                        },
                        chart: {
                                '1': 'hsl(var(--chart-1))',
                                '2': 'hsl(var(--chart-2))',
                                '3': 'hsl(var(--chart-3))',
                                '4': 'hsl(var(--chart-4))',
                                '5': 'hsl(var(--chart-5))'
                        },
                        sidebar: {
                                DEFAULT: 'hsl(var(--sidebar-background))',
                                foreground: 'hsl(var(--sidebar-foreground))',
                                primary: 'hsl(var(--sidebar-primary))',
                                'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
                                accent: 'hsl(var(--sidebar-accent))',
                                'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
                                border: 'hsl(var(--sidebar-border))',
                                ring: 'hsl(var(--sidebar-ring))'
                        },
                        'vs-bg': '#050505',
                        'vs-surface': '#0d1117',
                        'vs-surface-low': '#101519',
                        'vs-surface-mid': '#151b23',
                        'vs-surface-high': '#1f2630',
                        'vs-surface-highest': '#2a3340',
                        'vs-on-surface': '#e1e3e8',
                        'vs-on-surface-variant': '#8a939e',
                        'vs-primary': '#4CD7F6',
                        'vs-tertiary': '#c2d8f8',
                        'vs-outline': '#8a939e',
                        'vs-outline-variant': '#333840',
                },
                borderRadius: {
                        lg: 'var(--radius)',
                        md: 'calc(var(--radius) - 2px)',
                        sm: 'calc(var(--radius) - 4px)'
                },
                keyframes: {
                        'accordion-down': {
                                from: { height: '0' },
                                to: { height: 'var(--radix-accordion-content-height)' }
                        },
                        'accordion-up': {
                                from: { height: 'var(--radix-accordion-content-height)' },
                                to: { height: '0' }
                        },
                        'fade-in': {
                                from: { opacity: '0', transform: 'translateY(16px)' },
                                to: { opacity: '1', transform: 'translateY(0)' }
                        },
                        'fade-out': {
                                from: { opacity: '1', transform: 'translateY(0)' },
                                to: { opacity: '0', transform: 'translateY(-16px)' }
                        },
                        'countdown-pop': {
                                '0%': { transform: 'scale(0.5)', opacity: '0' },
                                '40%': { transform: 'scale(1.2)', opacity: '1' },
                                '70%': { transform: 'scale(0.95)' },
                                '100%': { transform: 'scale(1)', opacity: '1' }
                        },
                        'glow-pulse': {
                                '0%, 100%': { boxShadow: '0 0 20px rgba(76, 215, 246, 0.2)' },
                                '50%': { boxShadow: '0 0 60px rgba(76, 215, 246, 0.5)' }
                        },
                        'spin-slow': {
                                from: { transform: 'rotate(0deg)' },
                                to: { transform: 'rotate(360deg)' }
                        },
                        'slide-up': {
                                from: { opacity: '0', transform: 'translateY(40px)' },
                                to: { opacity: '1', transform: 'translateY(0)' }
                        },
                        'pulse-soft': {
                                '0%, 100%': { opacity: '0.4' },
                                '50%': { opacity: '1' }
                        },
                        'disc-pulse': {
                                '0%, 100%': { transform: 'scale(1)', opacity: '0.4' },
                                '50%': { transform: 'scale(1.05)', opacity: '0.8' }
                        },
                },
                animation: {
                        'accordion-down': 'accordion-down 0.2s ease-out',
                        'accordion-up': 'accordion-up 0.2s ease-out',
                        'fade-in': 'fade-in 0.8s ease-out forwards',
                        'fade-out': 'fade-out 0.5s ease-out forwards',
                        'countdown-pop': 'countdown-pop 0.6s ease-out forwards',
                        'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
                        'spin-slow': 'spin-slow 8s linear infinite',
                        'slide-up': 'slide-up 0.7s ease-out forwards',
                        'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
                        'disc-pulse': 'disc-pulse 3s ease-in-out infinite',
                }
        }
    },
    plugins: [require("tailwindcss-animate")],
}
