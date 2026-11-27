export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@nuxtjs/i18n', '@glot/nuxt'],
  glot: {
    enabled: true,
    url: process.env.GLOT_URL ?? 'http://localhost:3100',
    project: process.env.GLOT_PROJECT ?? 'glot/demo',
  },
  i18n: {
    defaultLocale: 'fr',
    strategy: 'no_prefix',
    locales: [
      { code: 'fr', file: 'fr.json' },
      { code: 'pl', file: 'pl.json' },
    ],
  },
})
