import { expect, test } from 'vite-plus/test'
import { checkText, checkWords, countWords, protectMessage, restoreMessage } from '../src/index.ts'

function codes(input: { source: string; target: string; avoid?: string[] }) {
  return checkText({ avoid: [], ...input }).map((failure) => failure.code)
}

test('named placeholders must be the same as in the source', () => {
  expect(codes({ source: 'Fin le {date}', target: 'Ended on {date}' })).toEqual([])

  const failures = checkText({ source: 'Fin le {date}', target: 'Koniec {data}', avoid: [] })

  expect(failures).toEqual([
    {
      code: 'PLACEHOLDERS',
      message:
        'The placeholders must match the source text. Missing from this text: {date}. Not in the source text: {data}.',
    },
  ])
})

test('list placeholders are compared by position number', () => {
  expect(codes({ source: '{0} sur {1}', target: '{1} of {0}' })).toEqual([])
  expect(codes({ source: '{0} sur {1}', target: '{0} of' })).toEqual(['PLACEHOLDERS'])
})

test('a literal placeholder is plain text, not a placeholder', () => {
  expect(codes({ source: "Écrire à {'@'}glot", target: "Write to {'@'}glot" })).toEqual([])
})

test('linked messages must point to the same texts', () => {
  expect(codes({ source: '@:actions.save le lot', target: '@:actions.save the lot' })).toEqual([])
  expect(codes({ source: '@.upper:actions.save', target: '@:actions.delete' })).toEqual([
    'PLACEHOLDERS',
  ])
  expect(codes({ source: '@:actions.save', target: 'Save' })).toEqual(['PLACEHOLDERS'])
})

test('plural forms must be as many as in the source', () => {
  const source = '{count} enchère | {count} enchères'

  expect(codes({ source, target: '{count} bid | {count} bids' })).toEqual([])

  const failures = checkText({ source, target: '{count} bids', avoid: [] })

  expect(failures).toEqual([
    {
      code: 'PLURAL_FORMS',
      message: 'The source text has 2 plural forms, separated by |. This text has 1.',
    },
  ])

  expect(
    codes({ source: 'aucun | un | {count}', target: 'none | one | {count} | {count} more' }),
  ).toEqual(['PLURAL_FORMS'])
})

test('plural forms may leave out a placeholder the other forms use', () => {
  expect(
    codes({ source: 'Une enchère | {count} enchères', target: 'One bid | {count} bids' }),
  ).toEqual([])
})

test('syntax mistakes are reported in words and stop the other checks', () => {
  expect(checkText({ source: 'Fin le {date}', target: 'Ended on {date', avoid: [] })).toEqual([
    { code: 'SYNTAX', message: 'A placeholder is opened but never closed.' },
  ])

  expect(checkText({ source: 'Fin', target: 'Mail contact@glot.dev', avoid: [] })).toEqual([
    {
      code: 'SYNTAX',
      message: "An at sign starts a link to another text. To show an at sign, write {'@'}.",
    },
  ])

  expect(codes({ source: 'Fin', target: 'Ended {}' })).toEqual(['SYNTAX'])
})

test('a source with a syntax mistake does not blame the target', () => {
  expect(codes({ source: 'Fin le {date', target: 'Ended on {date}' })).toEqual([])
})

test('HTML tags must be the same as in the source', () => {
  const source = 'J’accepte les <a href="/terms">conditions</a>'

  expect(codes({ source, target: 'I accept the <a href="/en/terms">terms</a>' })).toEqual([])

  const failures = checkText({
    source,
    target: 'I accept the <a href="/en/terms">terms',
    avoid: [],
  })

  expect(failures).toEqual([
    {
      code: 'HTML_TAGS',
      message: 'The HTML tags must match the source text. Missing from this text: </a>.',
    },
  ])

  expect(codes({ source: 'Ligne<br/>suivante', target: 'Next<br>line' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: '<b>{name}</b>', target: '<i>{name}</i>' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: '<b>a</b> <b>b</b>', target: '<b>a</b> <b>b' })).toEqual(['HTML_TAGS'])
})

test('words to avoid are found as whole words in any case', () => {
  const source = 'Ce lot est vendu aux enchères.'
  const avoid = ['Grundstück', 'Charge']

  expect(checkText({ source, target: 'Dieses Grundstück wird versteigert.', avoid })).toEqual([
    { code: 'AVOID_WORDS', message: 'Avoid “Grundstück”: the glossary asks for another word.' },
  ])

  expect(codes({ source, target: 'GRUNDSTÜCK!', avoid })).toEqual(['AVOID_WORDS'])
  expect(codes({ source, target: 'Dieses Los wird versteigert.', avoid })).toEqual([])
  expect(codes({ source, target: 'Chargé et Grundstücke', avoid })).toEqual([])
})

test('placeholder names are not scanned for words to avoid', () => {
  expect(codes({ source: '{charge}', target: '{charge}', avoid: ['charge'] })).toEqual([])
})

test('a never-translated word of the source must stay in the target', () => {
  const keep = ['Agorastore']

  expect(
    checkText({
      source: 'Bienvenue sur Agorastore',
      target: 'Welcome to Agorastore',
      avoid: [],
      keep,
    }),
  ).toEqual([])

  expect(
    checkText({
      source: 'Bienvenue sur Agorastore',
      target: 'Welcome to the store',
      avoid: [],
      keep,
    }),
  ).toEqual([
    {
      code: 'NEVER_TRANSLATE',
      message: 'Keep “Agorastore” as it is: the glossary says it is never translated.',
    },
  ])

  expect(checkText({ source: 'Bienvenue', target: 'Welcome', avoid: [], keep })).toEqual([])
})

test('checkWords reports only the glossary failures and nothing for a text with a syntax error', () => {
  const words = { avoid: ['Grundstück'], keep: ['Agorastore'] }

  expect(checkWords({ source: 'Ce lot', target: 'Dieses Grundstück {date', ...words })).toEqual([])

  expect(
    checkWords({ source: 'Ce lot sur Agorastore', target: 'Dieses Grundstück', ...words }).map(
      (failure) => failure.code,
    ),
  ).toEqual(['AVOID_WORDS', 'NEVER_TRANSLATE'])

  expect(
    checkWords({ source: 'Fin le {date}', target: 'Koniec {data}', avoid: [], keep: [] }),
  ).toEqual([])
})

test('words are counted in the plain text, without placeholders, tags or the plural bar', () => {
  expect(countWords('Enregistrer')).toBe(1)
  expect(countWords('Ends on {date} at {0}')).toBe(3)
  expect(countWords('<b>Save</b> your <i>changes</i> now')).toBe(4)
  expect(countWords('{count} item | {count} items')).toBe(2)
  expect(countWords("Écrire à {'@'}glot")).toBe(3)
  expect(countWords('')).toBe(0)
})

test('placeholders, links, literals and tags become numbered tokens and come back byte for byte', () => {
  for (const message of [
    'Fin le {date}',
    '{count} enchère | {count} enchères',
    "@:common.save et @.lower:{'x'} {0}",
    'J’accepte les <a href="/terms" class="x">conditions</a> {\'@\'}x',
    'Ligne<br/>deux {a}{b} <b>{a}</b>',
    'Déjà ⟦1⟧ écrit',
    '{broken',
    'Sans rien',
  ]) {
    const { text, tokens } = protectMessage(message)

    expect(restoreMessage({ text, tokens })).toEqual({ value: message, problems: [] })
  }

  expect(protectMessage('{count} enchère | {count} enchères')).toEqual({
    text: '⟦1⟧ enchère | ⟦2⟧ enchères',
    tokens: ['{count}', '{count}'],
  })

  expect(protectMessage('J’accepte les <a href="/t">conditions</a> {n}').text).toBe(
    'J’accepte les ⟦1⟧conditions⟦2⟧ ⟦3⟧',
  )
})

test('tokens may be reordered or spaced, but never dropped, repeated or invented', () => {
  const { tokens } = protectMessage('{a} et <b>{b}</b>')

  expect(restoreMessage({ text: '⟦4⟧ i ⟦2⟧⟦ 3 ⟧⟦1⟧', tokens })).toEqual({
    value: '</b> i <b>{b}{a}',
    problems: [],
  })

  expect(restoreMessage({ text: '⟦1⟧ ⟦2⟧ ⟦3⟧', tokens }).problems).toEqual([
    '⟦4⟧ is missing: it stands for </b>',
  ])

  expect(restoreMessage({ text: '⟦1⟧ ⟦2⟧ ⟦2⟧ ⟦3⟧ ⟦4⟧', tokens }).problems).toEqual([
    '⟦2⟧ appears 2 times instead of once',
  ])

  expect(restoreMessage({ text: '⟦1⟧ ⟦2⟧ ⟦3⟧ ⟦4⟧ ⟦9⟧', tokens })).toEqual({
    value: null,
    problems: ['⟦9⟧ does not exist in the source text'],
  })

  expect(restoreMessage({ text: '⟦1⟧ ⟦2⟧ ⟦3⟧ ⟦4⟧ ⟦5', tokens }).problems).toEqual([
    'A ⟦ or ⟧ is left over: a token is broken',
  ])
})

test('a translation may have as many plural forms as its language uses for whole numbers', () => {
  const source = '{count} enchère | {count} enchères'
  const polish = '{count} oferta | {count} oferty | {count} ofert'

  expect(checkText({ source, target: polish, avoid: [], language: 'pl' })).toEqual([])
  expect(
    checkText({ source, target: '{count} oferta | {count} ofert', avoid: [], language: 'pl' }),
  ).toEqual([])

  expect(
    checkText({ source, target: `${polish} | {count} oferty`, avoid: [], language: 'pl' }),
  ).toEqual([
    {
      code: 'PLURAL_FORMS',
      message: 'The source text has 2 plural forms and pl uses 3, separated by |. This text has 4.',
    },
  ])

  expect(
    checkText({
      source,
      target: '{count} bid | {count} bids | {count} bids',
      avoid: [],
      language: 'en',
    }),
  ).toEqual([
    {
      code: 'PLURAL_FORMS',
      message: 'The source text has 2 plural forms, separated by |. This text has 3.',
    },
  ])

  expect(
    checkText({
      source: 'Enregistrer',
      target: 'Zapisz | Zapisz | Zapisz',
      avoid: [],
      language: 'pl',
    }).map(({ code }) => code),
  ).toEqual(['PLURAL_FORMS'])
})

test('a vue-i18n text with a tag left open fails the HTML tags check', () => {
  expect(
    checkText({ source: 'Voir', target: 'See <a href="https://evil.example"', avoid: [] }).map(
      ({ code }) => code,
    ),
  ).toEqual(['HTML_TAGS'])
})

test('a vue-i18n translation may localize a link but never hide a tag behind a quoted >', () => {
  const source = 'J’accepte les <a title="CGU" href="/cgu">conditions</a>'

  expect(
    checkText({
      source,
      target: 'I accept the <a title=">" href="/en/terms">terms</a>',
      avoid: [],
    }),
  ).toEqual([])

  expect(
    checkText({ source, target: 'I accept the <a title=">terms', avoid: [] }).map(
      ({ code }) => code,
    ),
  ).toEqual(['HTML_TAGS'])
})

test('a vue-i18n translation may reword a title or localize a link, never add or change anything else', () => {
  const source = 'Voir <a href="/aide" title="Aide" class="link">l’aide</a>'

  expect(
    codes({ source, target: 'See <a class="link" href="/de/hilfe" title="Hilfe">die Hilfe</a>' }),
  ).toEqual([])

  for (const target of [
    'See <a href="/de/hilfe" title="Hilfe" class="link" onclick="steal()">help</a>',
    'See <a href="/de/hilfe" title="Hilfe" class="link" hidden>help</a>',
    'See <a href="/de/hilfe" title="Hilfe" class="cta">help</a>',
    `See <a data-x='href="/aide">' href="/de/hilfe" title="Hilfe" class="link">help</a>`,
  ]) {
    expect(codes({ source, target })).toEqual(['HTML_TAGS'])
  }
})

test('a vue-i18n link that is not in the source must be https, mailto, a path or an anchor', () => {
  const source = 'Voir <a href="/aide">l’aide</a>'

  for (const href of ['https://glot.dev/help', "mailto:help{'@'}glot.dev", '/en/help', '#help']) {
    expect(codes({ source, target: `See <a href="${href}">help</a>` })).toEqual([])
  }

  for (const href of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    '&#106;avascript:alert(1)',
    ' javascript:alert(1)',
    '//evil.example',
    '/\\evil.example',
    'data:text/html,x',
  ]) {
    expect(codes({ source, target: `See <a href="${href}">help</a>` })).toEqual(['LINKS'])
  }
})

test('a vue-i18n text cannot open a comment, a declaration or a broken closing tag the source does not have', () => {
  for (const target of [
    'See <!-- the rest',
    'See <![CDATA[ the rest',
    'See <?x the rest',
    'See </1 the rest',
  ]) {
    expect(codes({ source: 'Voir la suite', target })).toEqual(['HTML_TAGS'])
  }

  expect(codes({ source: 'Prix x<y', target: 'Price x<y' })).toEqual([])
  expect(codes({ source: 'Moins de 3 <3', target: 'Under 3 <3' })).toEqual([])
})

test('vue-i18n tags close in the order they open', () => {
  expect(
    checkText({ source: '<b><i>Vite</i></b>', target: '<b><i>Fast</b></i>', avoid: [] }),
  ).toEqual([
    {
      code: 'HTML_TAGS',
      message:
        'The HTML tags must match the source text. The tags close in a different order than they open.',
    },
  ])

  expect(codes({ source: '<b>Vite</b><br>', target: '<b>Fast</b><br/>' })).toEqual(['HTML_TAGS'])
})
