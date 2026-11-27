export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  modules: ['@nuxt/ui', '@nuxtjs/i18n', '@glot/nuxt'],
  buildDir: process.env.DEMO_BUILD_DIR ?? '.nuxt',
  devServer: { port: Number(process.env.DEMO_PORT ?? 3200) },
  css: ['~/assets/main.css'],
  ui: { fonts: false },
  icon: { mode: 'svg', serverBundle: { collections: ['lucide'] } },
  nitro: { output: { dir: process.env.DEMO_OUTPUT_DIR ?? '.output' } },
  runtimeConfig: {
    locales: {
      repository: process.env.GLOT_LOCALES_DIR ?? '',
      branches: process.env.GLOT_LOCALES_BRANCHES ?? 'glot/release,main',
      folder: 'packages/translations/i18n/locales',
    },
  },
  glot: {
    enabled: process.env.GLOT_ENABLED !== 'false',
    url: process.env.GLOT_URL ?? 'http://localhost:3100',
    project: process.env.GLOT_PROJECT ?? 'glot/demo',
  },
  i18n: {
    defaultLocale: 'fr',
    strategy: 'prefix_except_default',
    locales: ['fr', 'en', 'de', 'pl', 'nl'].map((code) => ({
      code,
      language: code,
      file: 'git.ts',
    })),
  },
})
