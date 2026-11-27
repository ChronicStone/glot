import { getCurrentInstance, shallowReactive } from 'vue'
import type { Composer } from 'vue-i18n'
import { PAGE_OWNER } from '../constants/widget.constants.ts'
import type { KeyLog } from '../types/widget.types.ts'

export function createKeyLog(): KeyLog {
  return { owners: new Map(), keys: shallowReactive(new Map()) }
}

export function logTranslations(options: { composer: Composer; log: KeyLog }) {
  const previous = options.composer.getPostTranslationHandler()

  options.composer.setPostTranslationHandler((translated, key) => {
    const output = previous ? previous(translated, key) : translated

    if (typeof output !== 'string') {
      return output
    }

    const owner = getCurrentInstance()?.uid ?? PAGE_OWNER
    const texts = options.log.owners.get(owner) ?? new Map<string, string>()

    texts.set(key, output)
    options.log.owners.set(owner, texts)

    if (options.log.keys.get(key) !== output) {
      options.log.keys.set(key, output)
    }

    return output
  })
}
