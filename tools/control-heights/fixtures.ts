const AT = '2026-11-26T09:00:00.000Z'

const FRENCH =
  'Votre offre de {amount} pour le lot {lot} a été dépassée par un autre enchérisseur juste avant la clôture : renchérissez maintenant pour rester en tête de la vente.'

function page(items: unknown[]) {
  return { items, total: items.length, nextCursor: null }
}

function draft(options: { id: string; language: string; value: string }) {
  return {
    id: options.id,
    textId: 'WyJzaGFyZWQtYmFzZSIsIm5vdGlmaWNhdGlvbnMiLCJvdXRiaWQiXQ',
    language: options.language,
    value: options.value,
    authorId: 'user-anna',
    status: 'CONFLICT',
    aiWritten: false,
    updatedAt: AT,
    authorName: 'Anna Kowalska-Wiśniewska',
    failures: [],
  }
}

const RELEASE = {
  id: '01a21a97-0000-7000-8000-000000000001',
  status: 'MERGED',
  trigger: 'MANUAL',
  commit: '5f401d6',
  pullRequestNumber: 482,
  pullRequestUrl: null,
  createdAt: AT,
  updatedAt: AT,
  mergedAt: AT,
  startedByName: 'Marie',
  changes: 3,
  approvals: 3,
}

function change(options: { id: string; language: string; previous: string; value: string }) {
  return {
    id: options.id,
    textId: 'WyJzaGFyZWQtYmFzZSIsIm5vdGlmaWNhdGlvbnMiLCJvdXRiaWQiXQ',
    language: options.language,
    previousValue: options.previous,
    value: options.value,
    authorName: 'Anna',
    undone: false,
  }
}

export type Fixture = { json: unknown; dates?: (string | number)[][] }

export const RELEASE_FIXTURES = {
  heldBack: {
    'releases/conflicts': {
      json: page([
        {
          reason: 'SOURCE_CHANGED',
          draft: draft({
            id: 'd1',
            language: 'pl',
            value:
              'Twoja oferta {amount} na partię {lot} została przebita przez innego licytującego tuż przed zamknięciem.',
          }),
          source: FRENCH,
          current: 'Twoja oferta {amount} została przebita.',
        },
        {
          reason: 'TEXT_REMOVED',
          draft: draft({
            id: 'd2',
            language: 'de',
            value: 'Ihr Gebot von {amount} wurde überboten.',
          }),
          source: null,
          current: null,
        },
      ]),
      dates: [
        ['items', 0, 'draft', 'updatedAt'],
        ['items', 1, 'draft', 'updatedAt'],
      ],
    },
  },
  undo: {
    'releases/history': {
      json: page([RELEASE]),
      dates: [
        ['items', 0, 'createdAt'],
        ['items', 0, 'updatedAt'],
        ['items', 0, 'mergedAt'],
      ],
    },
    'releases/changes': {
      json: page([
        change({ id: 'c1', language: 'pl', previous: 'Ratować', value: 'Zapisz' }),
        change({ id: 'c2', language: 'de', previous: 'LÖSCHEN', value: 'Löschen' }),
        change({
          id: 'c3',
          language: 'nl',
          previous: 'Uw bod is overboden',
          value: 'Uw bod van {amount} is overboden door een andere bieder',
        }),
      ]),
    },
  },
} satisfies Record<string, Record<string, Fixture>>
