const POLISH_FORMS = { one: 0, few: 1, many: 2, other: 2 } as const

const polish = new Intl.PluralRules('pl')

export default defineI18nConfig(() => ({
  pluralRules: {
    pl: (...[choice, choicesLength]: [number, number]) =>
      Math.min(POLISH_FORMS[polish.select(Math.abs(choice))], choicesLength - 1),
  },
}))
