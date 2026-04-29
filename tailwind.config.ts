import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: { "2xl": "1400px" },
    },
    extend: {
      fontFamily: {
        sans: ['Nunito', 'system-ui', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        board: {
          DEFAULT: "hsl(var(--board))",
          deep: "hsl(var(--board-deep))",
          line: "hsl(var(--board-line))",
        },
        hue: {
          red: "hsl(var(--hue-red))",
          orange: "hsl(var(--hue-orange))",
          yellow: "hsl(var(--hue-yellow))",
          lime: "hsl(var(--hue-lime))",
          green: "hsl(var(--hue-green))",
          teal: "hsl(var(--hue-teal))",
          blue: "hsl(var(--hue-blue))",
          indigo: "hsl(var(--hue-indigo))",
          violet: "hsl(var(--hue-violet))",
          magenta: "hsl(var(--hue-magenta))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 4px)",
        sm: "calc(var(--radius) - 8px)",
      },
      keyframes: {
        "accordion-down": { from: { height: "0" }, to: { height: "var(--radix-accordion-content-height)" } },
        "accordion-up": { from: { height: "var(--radix-accordion-content-height)" }, to: { height: "0" } },
        "fade-in": { "0%": { opacity: "0", transform: "translateY(8px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "scale-in": { "0%": { opacity: "0", transform: "scale(0.92)" }, "100%": { opacity: "1", transform: "scale(1)" } },
        "stone-pop": {
          "0%":  { transform: "scale(0) translateY(-6px)", opacity: "0" },
          "60%": { transform: "scale(1.18) translateY(0)",  opacity: "1" },
          "80%": { transform: "scale(0.92)" },
          "100%":{ transform: "scale(1)" },
        },
        "win-pulse": {
          "0%, 100%": { transform: "scale(1)", filter: "brightness(1)" },
          "50%":      { transform: "scale(1.18)", filter: "brightness(1.25)" },
        },
        "wiggle": {
          "0%,100%": { transform: "rotate(-3deg)" },
          "50%":     { transform: "rotate(3deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.35s ease-out",
        "scale-in": "scale-in 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "stone-pop": "stone-pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "win-pulse": "win-pulse 0.9s ease-in-out infinite",
        "wiggle": "wiggle 0.8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
