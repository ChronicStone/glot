export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  buildDir: process.env.GLOT_BUILD_DIR ?? '.nuxt',
  devtools: { enabled: true },
  modules: ['@nuxt/ui', '@vueuse/nuxt', '@ui-sdk/vue'],
  css: ['~/assets/css/main.css'],
  devServer: { port: 3100 },
  icon: { mode: 'svg', serverBundle: { collections: ['lucide'] } },
  ui: { fonts: false },
  app: {
    head: {
      title: 'Glot',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400..700&family=Geist+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
  vite: { optimizeDeps: { exclude: ['@tanstack/vue-table'] } },
})
