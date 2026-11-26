export const DEMO_REPOSITORY = 'glot/demo'

export const DEMO_REVIEWER = 'user-anna'

export const DEMO_SOURCE = {
  name: 'shared-base',
  pathPattern: 'packages/translations/i18n/locales/{locale}.json',
  sourceLanguage: 'fr',
  languages: ['fr', 'en', 'de', 'pl', 'nl'],
}

export const DEMO_TEXTS: Array<{
  path: string[]
  values: Record<string, string>
  reviewed: string[]
}> = [
  {
    path: ['actions', 'save'],
    values: { fr: 'Enregistrer', en: 'Save', de: 'Speichern', pl: 'Ratować', nl: 'Opslaan' },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['actions', 'delete'],
    values: { fr: 'Supprimer', en: 'Delete', de: 'LÖSCHEN', pl: 'USUWAĆ', nl: 'Verwijderen' },
    reviewed: ['en', 'nl'],
  },
  {
    path: ['marketplace', 'itemCard', 'outbid'],
    values: {
      fr: 'Enchère dépassée',
      en: 'Outbid',
      de: 'Überboten',
      pl: 'Oferta przebita',
      nl: 'Overboden',
    },
    reviewed: ['en'],
  },
  {
    path: ['marketplace', 'itemCard', 'endedOn'],
    values: {
      fr: 'Fin le {date}',
      en: 'Ended on {date}',
      de: 'Endet am {date}',
      pl: 'Koniec {data}',
      nl: 'Eindigt op {date}',
    },
    reviewed: ['en', 'de', 'nl'],
  },
  {
    path: ['marketplace', 'itemCard', 'bids'],
    values: {
      fr: '{count} enchère | {count} enchères',
      en: '{count} bid | {count} bids',
      de: '{count} Gebot',
      pl: '{count} oferta | {count} oferty',
      nl: '{count} bod | {count} biedingen',
    },
    reviewed: ['en', 'nl'],
  },
  {
    path: ['marketplace', 'lotDescription'],
    values: {
      fr: 'Ce lot est vendu aux enchères.',
      en: 'This lot is sold at auction.',
      de: 'Dieses Grundstück wird versteigert.',
      nl: 'Deze kavel wordt geveild.',
    },
    reviewed: [],
  },
  {
    path: ['legal', 'terms'],
    values: {
      fr: 'J’accepte les <a href="/terms">conditions</a>',
      en: 'I accept the <a href="/en/terms">terms</a>',
      de: 'Ich akzeptiere die <a href="/de/terms">Bedingungen',
      nl: 'Ik accepteer de <a href="/nl/terms">voorwaarden</a>',
    },
    reviewed: [],
  },
  {
    path: ['apiErrorMessages', 'WALLET_ID_MISSING'],
    values: {
      fr: 'Il manque le moyen de paiement.',
      en: 'The payment method is missing.',
      de: 'Die Zahlungsmethode fehlt.',
      nl: 'De betaalmethode ontbreekt.',
    },
    reviewed: [],
  },
]
