const SAMPLED_COUNTS = 200
const LISTED_COUNTS = 26
const CATEGORY_ORDER = ['zero', 'one', 'two', 'few', 'many', 'other']

function pluralCategories(language: string) {
  const rules = new Intl.PluralRules(language)
  const counts = new Map<string, number[]>()

  for (let count = 0; count < SAMPLED_COUNTS; count += 1) {
    const category = rules.select(count)

    counts.set(category, [...(counts.get(category) ?? []), count])
  }

  return [...counts.entries()]
    .toSorted(([a], [b]) => CATEGORY_ORDER.indexOf(a) - CATEGORY_ORDER.indexOf(b))
    .map(([, found]) => found)
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

const DEFAULT_FORMS: Record<number, Array<{ label: string; sample: number }>> = {
  2: [
    { label: '1', sample: 1 },
    { label: '0, 2 or more', sample: 2 },
  ],
  3: [
    { label: '0', sample: 0 },
    { label: '1', sample: 1 },
    { label: '2 or more', sample: 2 },
  ],
}

function formTargets(options: { language: string; count: number }) {
  const categories = pluralCategories(options.language)

  if (categories.length === options.count) {
    return categories.map((counts) => ({
      label: describeCounts(counts),
      sample: counts.find((count) => count > 0) ?? 1,
    }))
  }

  return (
    DEFAULT_FORMS[options.count] ??
    Array.from({ length: options.count }, (_, index) => ({
      label: `Form ${index + 1}`,
      sample: index + 1,
    }))
  )
}

export function pluralForms(options: { language: string; value: string }) {
  const forms = options.value.split('|').map((form) => form.trim())
  const targets = formTargets({ language: options.language, count: forms.length })

  return forms.map((form, index) => ({
    label: targets[index]?.label ?? '',
    value: form.replaceAll(/\{(?:count|n)\}/gu, String(targets[index]?.sample ?? index + 1)),
  }))
}
