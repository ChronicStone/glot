import { defineNuxtPlugin, useRuntimeConfig } from 'nuxt/app'
import { WIDGET_TAG } from '../../constants/module.constants.ts'
import { isComposer } from '../utils/i18n.utils.ts'
import { createKeyLog, logTranslations } from '../utils/key-log.utils.ts'
import { isWidgetWanted } from '../utils/session.utils.ts'

export default defineNuxtPlugin({
  name: 'glot',
  enforce: 'post',
  setup(nuxtApp) {
    const { url, project } = useRuntimeConfig().public.glot
    const composer = nuxtApp.$i18n

    if (!isComposer(composer) || !isWidgetWanted(project)) {
      return
    }

    const log = createKeyLog()

    logTranslations({ composer, log })

    nuxtApp.hook('app:mounted', async () => {
      const [{ mountWidget }, { default: css }] = await Promise.all([
        import('../utils/widget.utils.ts'),
        import('#build/glot/widget-css.mjs'),
      ])

      mountWidget({
        app: nuxtApp.vueApp,
        composer,
        log,
        widget: { tag: WIDGET_TAG, css, url, project },
      })
    })
  },
})
