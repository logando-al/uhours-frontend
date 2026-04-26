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
            "script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://static.cloudflareinsights.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data:",
            "manifest-src 'self'",
            "worker-src 'self'",
            "connect-src 'self' https://uhours-api.ltechnosoft.com https://cloudflareinsights.com",
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

  modules: ['@pinia/nuxt', '@nuxtjs/turnstile', '@primevue/nuxt-module', '@vite-pwa/nuxt'],

  pwa: {
    registerType: 'autoUpdate',
    manifestFilename: 'manifest.webmanifest',
    includeAssets: [
      'favicon.ico',
      'favicon.png',
      'favicon-16x16.png',
      'favicon-32x32.png',
      'apple-touch-icon.png',
    ],
    client: {
      installPrompt: true,
      periodicSyncForUpdates: 60 * 60,
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,png,ico,webmanifest}'],
      navigateFallback: '/',
      cleanupOutdatedCaches: true,
    },
    manifest: {
      name: 'UHours',
      short_name: 'UHours',
      description: 'Visual TA Hours Monitoring System for UTP Postgraduate Students',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      background_color: '#ffffff',
      theme_color: '#4A8FF0',
      icons: [
        {
          src: '/icon-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/icon-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    },
  },

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
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'icon', type: 'image/png', href: '/favicon-32x32.png', sizes: '32x32' },
        { rel: 'icon', type: 'image/png', href: '/favicon-16x16.png', sizes: '16x16' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' },
        { rel: 'manifest', href: '/manifest.webmanifest' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,400;0,14..32,500;0,14..32,600;0,14..32,700;0,14..32,800;1,14..32,400&display=swap',
        },
      ],
      meta: [
        { name: 'theme-color', content: '#4A8FF0' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'UHours' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
      ],
    },
  },
})
