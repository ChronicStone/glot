import type { CatalogSource } from '../types/catalog.types.ts'

export const DEMO_CATALOG: CatalogSource = {
  texts: {
    'glot/demo': [
      {
        id: 'actions.save',
        key: {
          source: 'shared-base',
          path: ['actions', 'save'],
        },
        source: {
          language: 'fr',
          value: 'Enregistrer',
        },
        where: 'Save button · 266 pages',
        shownIn: ['Admin', 'Market'],
        readers: 266,
        translations: [
          {
            language: 'en',
            value: 'Save',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'de',
            value: 'Speichern',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'pl',
            value: 'Ratować',
            state: 'NEEDS_FIX',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'nl',
            value: 'Opslaan',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
        ],
      },
      {
        id: 'actions.delete',
        key: {
          source: 'shared-base',
          path: ['actions', 'delete'],
        },
        source: {
          language: 'fr',
          value: 'Supprimer',
        },
        where: 'Delete button · 118 pages',
        shownIn: ['Admin', 'Market'],
        readers: 118,
        translations: [
          {
            language: 'en',
            value: 'Delete',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'de',
            value: 'LÖSCHEN',
            state: 'NEEDS_FIX',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'pl',
            value: 'USUWAĆ',
            state: 'NEEDS_FIX',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'nl',
            value: 'Verwijderen',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
        ],
      },
      {
        id: 'lotCard.outbid',
        key: {
          source: 'shared-base',
          path: ['marketplace', 'itemCard', 'outbid'],
        },
        source: {
          language: 'fr',
          value: 'Enchère dépassée',
        },
        where: 'Lot card · Market',
        shownIn: ['Market'],
        readers: 64,
        translations: [
          {
            language: 'en',
            value: 'Outbid',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'de',
            value: 'Überboten',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
          {
            language: 'pl',
            value: 'Oferta przebita',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
          {
            language: 'nl',
            value: 'Overboden',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
        ],
      },
      {
        id: 'lotCard.endedOn',
        key: {
          source: 'shared-base',
          path: ['marketplace', 'itemCard', 'endedOn'],
        },
        source: {
          language: 'fr',
          value: 'Fin le {date}',
        },
        where: 'Lot card · Market',
        shownIn: ['Market'],
        readers: 51,
        translations: [
          {
            language: 'en',
            value: 'Ended on {date}',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'de',
            value: 'Endet am {date}',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'pl',
            value: 'Koniec {date}',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
          {
            language: 'nl',
            value: 'Eindigt op {date}',
            state: 'REVIEWED',
            reviewedBy: null,
            aiWritten: false,
          },
        ],
      },
      {
        id: 'errors.paymentMethodMissing',
        key: {
          source: 'shared-base',
          path: ['apiErrorMessages', 'WALLET_ID_MISSING'],
        },
        source: {
          language: 'fr',
          value: 'Il manque le moyen de paiement.',
        },
        where: 'Error message · Admin',
        shownIn: ['Admin'],
        readers: 3,
        translations: [
          {
            language: 'en',
            value: 'The payment method is missing.',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
          {
            language: 'de',
            value: 'Die Zahlungsmethode fehlt.',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
          {
            language: 'pl',
            value: null,
            state: 'MISSING',
            reviewedBy: null,
            aiWritten: false,
          },
          {
            language: 'nl',
            value: 'De betaalmethode ontbreekt.',
            state: 'TO_CHECK',
            reviewedBy: null,
            aiWritten: true,
          },
        ],
      },
    ],
  },
  glossary: {
    'glot/demo': [
      {
        id: 'lot',
        name: 'lot',
        definition: 'An item sold at auction, never a plot of land.',
        status: 'VALIDATED',
        neverTranslate: false,
        terms: {
          en: {
            term: 'lot',
            plural: 'lots',
            avoid: [],
          },
          de: {
            term: 'Los',
            plural: 'Lose',
            avoid: ['Grundstück', 'Charge'],
          },
          pl: {
            term: 'partia',
            plural: 'partie',
            avoid: ['działka'],
          },
          nl: {
            term: 'kavel',
            plural: 'kavels',
            avoid: ['perceel'],
          },
        },
      },
    ],
  },
}
