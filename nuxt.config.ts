// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

const isDev = process.env.NODE_ENV === 'development'

// Match UHours palette: blue accent (#4A8FF0) on dark navy
const UHoursPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50:  '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#4A8FF0',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
      950: '#172554',
    },
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,
  nitro: { preset: 'cloudflare_pages' },

  routeRules: {
    '/**': {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        // CSP enforced in production only — dev uses localhost:8080 which isn't in the allowlist
        ...(!isDev && {
          'Content-Security-Policy': [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data:",
            "connect-src 'self' https://api.uhours.ltechnosoft.com",
            "frame-src https://challenges.cloudflare.com",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests",
          ].join('; '),
        }),
      },
    },
  },

  modules: ['@pinia/nuxt', '@nuxtjs/turnstile', '@primevue/nuxt-module'],

  primevue: {
    options: {
      theme: {
        preset: UHoursPreset,
        options: {
          prefix: 'p',
          // dark = default (:root), light = [data-theme="light"]
          darkModeSelector: '[data-theme="dark"]',
          cssLayer: false,
        },
      },
    },
  },

  components: [
    { path: '~/components/ui', pathPrefix: false },
    { path: '~/components/auth', pathPrefix: false },
  ],

  css: ['primeicons/primeicons.css', '~/assets/css/main.css'],

  postcss: {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  },

  turnstile: {
    siteKey: process.env.NUXT_PUBLIC_TURNSTILE_SITE_KEY,
  },

  runtimeConfig: {
    public: {
      apiBaseUrl: process.env.NUXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8080/api/v1',
      appName: process.env.NUXT_PUBLIC_APP_NAME ?? 'UHours',
    },
  },

  app: {
    head: {
      script: [
        {
          // Set data-theme before first paint to prevent FOUC
          innerHTML: `(function(){var e=localStorage.getItem('uhours-theme-explicit')==='true',s=localStorage.getItem('uhours-theme'),t=e&&(s==='dark'||s==='light'||s==='system')?s:'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.setAttribute('data-theme',d?'dark':'light');})();`,
        },
      ],
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap',
        },
      ],
    },
  },
})
