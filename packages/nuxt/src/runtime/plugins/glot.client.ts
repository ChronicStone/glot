import { defineNuxtPlugin } from 'nuxt/app'
import widgetCss from '#build/glot/widget-css.mjs'
import { ref } from 'vue'
import { WIDGET_TAG } from '../../constants/module.constants.ts'
import { isComposer } from '../utils/i18n.utils.ts'
import { mountWidget } from '../utils/widget.utils.ts'

export default defineNuxtPlugin({
  name: 'glot',
  enforce: 'post',
  setup(nuxtApp) {
    const seen = ref<Map<string, string>>(new Map())
    const composer = nuxtApp.$i18n

    if (isComposer(composer)) {
      const previous = composer.getPostTranslationHandler()

      composer.setPostTranslationHandler((translated, key) => {
        const output = previous ? previous(translated, key) : translated

        if (typeof output === 'string') {
          seen.value.set(key, output)
        }

        return output
      })
    }

    nuxtApp.hook('app:mounted', () => mountWidget({ tag: WIDGET_TAG, css: widgetCss, seen }))
  },
})
