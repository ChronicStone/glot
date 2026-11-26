export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  buildDir: process.env.GLOT_BUILD_DIR ?? '.nuxt',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@vueuse/nuxt', '@ui-sdk/vue'],
  css: ['~/assets/css/main.css'],
  devServer: { port: 3100 },
  icon: { serverBundle: { collections: ['lucide'] } },
  app: { head: { title: 'Glot' } },
})
