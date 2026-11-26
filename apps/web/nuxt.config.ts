import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-11-01',
  ssr: false,
  buildDir: process.env.GLOT_BUILD_DIR ?? '.nuxt',
  devtools: { enabled: true },
  modules: ['@ui-sdk/vue'],
  css: ['~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  devServer: { port: 3100 },
  app: {
    head: {
      title: 'Glot',
      link: [
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,500;14..32,600&family=Geist+Mono:wght@400;500&display=swap',
        },
      ],
    },
  },
})
