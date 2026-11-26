import { GLOSSARY_TERM_STATUSES } from '@glot/database/constants/glossary'
import type { GlossaryTermStatus } from '@glot/database/types/glossary'

export const DEMO_GLOSSARY: Array<{
  name: string
  definition: string
  status: GlossaryTermStatus
  neverTranslate: boolean
  notes: string
  terms: Record<string, { term: string; plural: string | null; avoid: string[] }>
}> = [
  {
    name: 'lot',
    definition: 'An item sold at auction, never a plot of land.',
    status: GLOSSARY_TERM_STATUSES.VALIDATED,
    neverTranslate: false,
    notes: 'Not a batch of goods: one lot is one item for sale, with its own bids.',
    terms: {
      fr: { term: 'lot', plural: 'lots', avoid: [] },
      en: { term: 'lot', plural: 'lots', avoid: [] },
      de: { term: 'Los', plural: 'Lose', avoid: ['Grundstück', 'Charge'] },
      pl: { term: 'partia', plural: 'partie', avoid: ['działka'] },
      nl: { term: 'kavel', plural: 'kavels', avoid: ['perceel'] },
    },
  },
  {
    name: 'bid',
    definition: 'An offer a buyer makes on a lot during an auction.',
    status: GLOSSARY_TERM_STATUSES.VALIDATED,
    neverTranslate: false,
    notes: '',
    terms: {
      fr: { term: 'enchère', plural: 'enchères', avoid: [] },
      en: { term: 'bid', plural: 'bids', avoid: [] },
      de: { term: 'Gebot', plural: 'Gebote', avoid: ['Angebot'] },
      pl: { term: 'oferta', plural: 'oferty', avoid: [] },
      nl: { term: 'bod', plural: 'biedingen', avoid: [] },
    },
  },
  {
    name: 'Agorastore',
    definition: 'The name of the marketplace.',
    status: GLOSSARY_TERM_STATUSES.VALIDATED,
    neverTranslate: true,
    notes: 'A brand name, written the same way in every language.',
    terms: { fr: { term: 'Agorastore', plural: null, avoid: [] } },
  },
  {
    name: 'reserve price',
    definition: 'The price under which the seller does not sell.',
    status: GLOSSARY_TERM_STATUSES.SUGGESTED,
    neverTranslate: false,
    notes: '',
    terms: {
      fr: { term: 'prix de réserve', plural: 'prix de réserve', avoid: [] },
      en: { term: 'reserve price', plural: 'reserve prices', avoid: [] },
      de: { term: 'Mindestpreis', plural: 'Mindestpreise', avoid: ['Reservepreis'] },
    },
  },
]
