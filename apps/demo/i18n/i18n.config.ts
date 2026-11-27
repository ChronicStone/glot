const POLISH_FORMS: Record<Intl.LDMLPluralRule, number> = {
  zero: 2,
  one: 0,
  two: 2,
  few: 1,
  many: 2,
  other: 2,
}

const polish = new Intl.PluralRules('pl')

export default defineI18nConfig(() => ({
  pluralRules: {
    pl: (...[choice, choicesLength]: [number, number]) =>
      Math.min(POLISH_FORMS[polish.select(Math.abs(choice))], choicesLength - 1),
  },
}))
