import type { GlossaryTerm } from '@glot/contract'

export const DEMO_GLOSSARY: Record<string, GlossaryTerm[]> = {
  'glot/demo': [
    {
      id: 'lot',
      name: 'lot',
      definition: 'An item sold at auction, never a plot of land.',
      status: 'VALIDATED',
      neverTranslate: false,
      notes: '',
      terms: {
        en: { term: 'lot', plural: 'lots', avoid: [] },
        de: { term: 'Los', plural: 'Lose', avoid: ['Grundstück', 'Charge'] },
        pl: { term: 'partia', plural: 'partie', avoid: ['działka'] },
        nl: { term: 'kavel', plural: 'kavels', avoid: ['perceel'] },
      },
    },
  ],
}
