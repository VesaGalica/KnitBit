// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2026-10-27',

  modules: ['@pinia/nuxt', '@nuxtjs/i18n', '@vite-pwa/nuxt', '@nuxt/eslint'],

  // The app has no backend, so it is rendered entirely in the browser.
  // This keeps the offline behaviour simple: the service worker only has to
  // cache static files, never server-rendered HTML.
  ssr: false,

  devtools: { enabled: true },

  css: ['~/assets/css/main.css'],

  typescript: {
    strict: true,
  },

  app: {
    head: {
      htmlAttrs: { lang: 'en' },
      title: 'KnitBit',
      meta: [
        // viewport-fit=cover lets the app draw under the notch; the CSS then
        // pushes content back in with env(safe-area-inset-*).
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Knitting as a system for binary representation and modelling of algorithms' },
        // iOS "Add to Home Screen" behaviour.
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'KnitBit' },
        // black-translucent makes the status bar transparent so the page
        // background shows through; the safe-area padding keeps text clear of it.
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
        { name: 'theme-color', content: '#faf7f2', media: '(prefers-color-scheme: light)' },
        { name: 'theme-color', content: '#1b1a19', media: '(prefers-color-scheme: dark)' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
      ],
    },
  },

  i18n: {
    // English is the only language. i18n is kept so every UI string lives in
    // one file (en.json) instead of being spread over the components.
    defaultLocale: 'en',
    strategy: 'no_prefix',
    locales: [
      { code: 'en', language: 'en-GB', name: 'English', file: 'en.json' },
    ],
    detectBrowserLanguage: false,
  },

  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'KnitBit',
      short_name: 'KnitBit',
      description: 'Knitting as a system for binary representation and modelling of algorithms',
      lang: 'en',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#faf7f2',
      theme_color: '#faf7f2',
      icons: [
        { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      // Pre-cache the whole build so every tab works offline after the first load.
      globPatterns: ['**/*.{js,css,html,json,svg,png,ico,webmanifest}'],
      // Unknown URLs fall back to the app shell (client-side routing).
      navigateFallback: '/',
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      // Off by default: a service worker in dev caches aggressively and hides changes.
      enabled: false,
      type: 'module',
    },
  },
})
