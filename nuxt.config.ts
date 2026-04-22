// https://nuxt.com/docs/api/configuration/nuxt-config
import Aura from '@primeuix/themes/aura'
import { definePreset } from '@primeuix/themes'

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
  colorScheme: {
    dark: {
      surface: {
        0:    '#ffffff',
        50:   '#0C1A35',
        100:  '#0C1A35',
        200:  '#0e1f3d',
        300:  '#122448',
        400:  '#1a3060',
        500:  '#1e3a8a',
        600:  '#254cb0',
        700:  '#2d5fd4',
        800:  '#4A8FF0',
        900:  '#93c5fd',
        950:  '#dbeafe',
        ground:   '#070E1C',
        section:  '#0C1A35',
      },
    },
  },
})

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,
  nitro: { preset: 'cloudflare_pages' },

  modules: ['@pinia/nuxt', '@nuxtjs/turnstile', '@primevue/nuxt-module'],

  primevue: {
    options: {
      theme: {
        preset: UHoursPreset,
        options: {
          prefix: 'p',
          // dark = default (:root), light = [data-theme="light"]
          darkModeSelector: ':root:not([data-theme="light"])',
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
