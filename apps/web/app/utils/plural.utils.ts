import { integerPluralCategories } from '@glot/checks'

const LABELLED_COUNTS = 100
const LISTED_COUNTS = 26

function pluralCategories(language: string) {
  const rules = new Intl.PluralRules(language)
  const counts = Array.from({ length: LABELLED_COUNTS }, (_, count) => count)

  return integerPluralCategories(language).map(
    (category) => [category, counts.filter((count) => rules.select(count) === category)] as const,
  )
}

function describeCounts(counts: number[]) {
  const listed = counts.filter((count) => count < LISTED_COUNTS)
  const ranges: string[] = []

  for (let at = 0; at < listed.length;) {
    let end = at

    while (listed[end + 1] === (listed[end] ?? 0) + 1) {
      end += 1
    }

    ranges.push(
      end - at >= 2 ? `${listed[at]}–${listed[end]}` : listed.slice(at, end + 1).join(', '),
    )
    at = end + 1
  }

  return `${ranges.join(', ')}${counts.length > listed.length ? '…' : ''}`
}

const DEFAULT_FORMS: Record<number, Array<{ name: string; label: string; sample: number }>> = {
  2: [
    { name: 'One', label: '1', sample: 1 },
    { name: 'Other', label: '0, 2 or more', sample: 2 },
  ],
  3: [
    { name: 'Zero', label: '0', sample: 0 },
    { name: 'One', label: '1', sample: 1 },
    { name: 'Other', label: '2 or more', sample: 2 },
  ],
}

function formTargets(options: { language: string; count: number }) {
  const categories = pluralCategories(options.language)

  if (categories.length === options.count) {
    return categories.map(([category, counts]) => ({
      name: `${category.charAt(0).toUpperCase()}${category.slice(1)}`,
      label: describeCounts(counts),
      sample: counts.find((count) => count > 0) ?? 1,
    }))
  }

  if (options.count === 1) {
    return [{ name: 'Text', label: '', sample: 1 }]
  }

  return (
    DEFAULT_FORMS[options.count] ??
    Array.from({ length: options.count }, (_, index) => ({
      name: `Form ${index + 1}`,
      label: '',
      sample: index + 1,
    }))
  )
}

export function pluralForms(options: { language: string; value: string }) {
  const forms = options.value.split('|').map((form) => form.trim())
  const targets = formTargets({ language: options.language, count: forms.length })

  return forms.map((form, index) => ({
    name: targets[index]?.name ?? '',
    label: targets[index]?.label ?? '',
    form,
    value: form.replaceAll(/\{(?:count|n)\}/gu, String(targets[index]?.sample ?? index + 1)),
  }))
}
