import { integerPluralCategories } from '@glot/checks'
import { PLURAL, VUE_I18N_FORM_LABELS } from '../constants/widget.constants.ts'

function ranges(numbers: number[]) {
  const found: Array<[number, number]> = []

  for (const value of numbers) {
    const last = found.at(-1)

    if (last && last[1] === value - 1) {
      last[1] = value
    } else {
      found.push([value, value])
    }
  }

  return found
}

function describe(numbers: number[]) {
  const all = ranges(numbers)

  const shown = all.slice(0, PLURAL.RANGES_SHOWN).map(([from, to]) => {
    if (to === PLURAL.SAMPLE_UP_TO) {
      return `${from}+`
    }

    return from === to ? String(from) : `${from}–${to}`
  })

  return all.length > PLURAL.RANGES_SHOWN ? `${shown.join(', ')}…` : shown.join(', ')
}

export function pluralForms(value: string) {
  return value.split(PLURAL.SPLIT)
}

export function pluralLabels(options: { language: string; count: number; appRule: boolean }) {
  const rules = new Intl.PluralRules(options.language)
  const numbers = Array.from({ length: PLURAL.SAMPLE_UP_TO + 1 }, (_, index) => index)

  const categories = integerPluralCategories(options.language)

  if (options.appRule && categories.length === options.count) {
    return categories.map(
      (category) =>
        describe(numbers.filter((value) => value > 0 && rules.select(value) === category)) ||
        describe(numbers.filter((value) => rules.select(value) === category)),
    )
  }

  if (options.count === VUE_I18N_FORM_LABELS.THREE.length) {
    return [...VUE_I18N_FORM_LABELS.THREE]
  }

  if (options.count === VUE_I18N_FORM_LABELS.TWO.length) {
    return [...VUE_I18N_FORM_LABELS.TWO]
  }

  return Array.from({ length: options.count }, (_, index) => String(index + 1))
}
