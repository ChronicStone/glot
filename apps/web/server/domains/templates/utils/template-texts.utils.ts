import type { Text } from '@glot/contract'
import type { TextState } from '@glot/database/types/texts'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { TEXT_STATE_SEVERITY } from '../constants/templates.constants.ts'
import type { AdapterBrand, AdapterTemplate } from '../types/templates.types.ts'

function keyOf(options: { source: string; path: string[] }) {
  return JSON.stringify([options.source, ...options.path])
}

export function templateTexts(options: {
  template: AdapterTemplate
  brand: AdapterBrand
  texts: Text[]
}) {
  const byKey = new Map(options.texts.map((text) => [keyOf(text.key), text]))

  return options.template.texts.flatMap((path) => {
    const found = options.brand.sources
      .map((source) => byKey.get(keyOf({ source, path })))
      .find((text) => text !== undefined)

    return found ? [found] : []
  })
}

export function worstState(texts: Text[]): TextState {
  return texts
    .flatMap((text) => text.translations.map(({ state }) => state))
    .reduce<TextState>(
      (worst, state) => (TEXT_STATE_SEVERITY[state] > TEXT_STATE_SEVERITY[worst] ? state : worst),
      TEXT_STATES.REVIEWED,
    )
}

export function valueIn(options: { text: Text; language: string }) {
  if (options.language === options.text.source.language) {
    return options.text.source.value
  }

  const translation = options.text.translations.find(
    ({ language }) => language === options.language,
  )

  return translation?.draft?.value ?? translation?.value ?? options.text.source.value
}
