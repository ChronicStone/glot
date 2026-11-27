import { expect, test } from 'vite-plus/test'
import {
  checkSource,
  checkText,
  checkWords,
  countWords,
  protectMessage,
  restoreMessage,
} from '../src/index.ts'

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

  expect(codes({ source: 'Ligne<br/>suivante', target: 'Next<br>line' })).toEqual([])
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

test('a vue-i18n translation may localize a link and reword its title, never hide markup in it', () => {
  const source = 'J’accepte les <a title="CGU" href="/cgu">conditions</a>'

  expect(
    checkText({
      source,
      target: 'I accept the <a title="Terms" href="/en/terms">terms</a>',
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

test('a vue-i18n text cannot leave a tag, a comment or a declaration open, even as its source does', () => {
  for (const target of [
    'See <!-- the rest',
    'See <![CDATA[ the rest',
    'See <?x the rest',
    'See </1 the rest',
  ]) {
    expect(codes({ source: 'Voir la suite', target })).toEqual(['HTML_TAGS'])
  }

  expect(codes({ source: 'Prix x<y', target: 'Price x<y' })).toEqual(['HTML_TAGS'])
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

  expect(codes({ source: '<b>Vite</b><br>', target: '<b>Fast</b><br />' })).toEqual([])

  expect(
    codes({
      source: '<a href="/x">un</a> | <a href="/x">deux</a>',
      target: '<a href="/x">one | </a><a href="/x">two</a>',
    }),
  ).toEqual(['HTML_TAGS'])
})

test('a vue-i18n literal or placeholder cannot build a tag or a link the check does not see', () => {
  const source = 'Voir <a href="/aide">l’aide</a>'

  expect(
    codes({ source, target: `See <a href="/aide">help</a>{'<'}img src=x onerror=alert(1){'>'}` }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source, target: `See <a href="/{'/'}evil.example">help</a>` })).toEqual(['LINKS'])

  expect(
    codes({
      source: 'Bonjour {name}',
      target: 'Hello <{name} onmouseover=alert(1) style=position:fixed;inset:0>',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: "Prix {'<'} {max}", target: "Price {'<'} {max}" })).toEqual([])
})

test('a stray < fails even when the source has one: a less-than is written &lt;', () => {
  expect(codes({ source: 'Si a<b alors', target: 'If a<b then' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: 'Si a &lt; b alors', target: 'If a &lt; b then' })).toEqual([])
  expect(codes({ source: 'Si a<b alors', target: 'If a<c then' })).toEqual(['HTML_TAGS'])
})

test('plural forms are checked one by one, so a language with more forms keeps the tags', () => {
  const source = '<b>{n}</b> lot | <b>{n}</b> lots'

  expect(
    checkText({
      source,
      target: '<b>{n}</b> partia | <b>{n}</b> partie | <b>{n}</b> partii',
      avoid: [],
      language: 'pl',
    }),
  ).toEqual([])

  expect(checkText({ source, target: '<b>{n}</b> ロット', avoid: [], language: 'ja' })).toEqual([])

  expect(
    checkText({
      source,
      target: '<b>{n}</b> partia | <b>{n} partie | <b>{n}</b> partii',
      avoid: [],
      language: 'pl',
    }).map(({ code }) => code),
  ).toEqual(['HTML_TAGS'])
})

test('a vue-i18n link may move to a relative path or another phone number, never hide behind an entity or a space', () => {
  const source = 'Appelez <a href="tel:+33100000000" lang="fr">le support</a>'

  for (const target of [
    'Call <a href="tel:+441000000000" lang="en">support</a>',
    'Call <a href="support" lang="en">support</a>',
  ]) {
    expect(codes({ source, target })).toEqual([])
  }

  for (const href of ['/&#47;evil.example', '/\t/evil.example', ' https://evil.example']) {
    expect(codes({ source, target: `Call <a href="${href}" lang="en">support</a>` })).toEqual([
      'LINKS',
    ])
  }
})

test('a placeholder cannot become a link, and a stray < in the source does not open the door to a tag with attributes', () => {
  expect(
    codes({
      source: 'Voir <a href="/aide">l’aide</a> {url}',
      target: 'See <a href="{url}">help</a>',
    }),
  ).toEqual(['LINKS'])

  expect(
    codes({ source: 'Voir <a href="{url}">l’aide</a>', target: 'See <a href="{url}">help</a>' }),
  ).toEqual([])

  expect(codes({ source: 'Taille x<i', target: 'Size x<img src=x onerror=alert(1)' })).toEqual([
    'HTML_TAGS',
  ])

  expect(codes({ source: 'Si a<b alors', target: 'If a<b onmouseover=alert(1) then' })).toEqual([
    'HTML_TAGS',
  ])
})

test('a stray < the source has never lets a tag close after it, nor a placeholder or linked text become a link', () => {
  expect(
    codes({ source: 'Si x<i alors', target: 'If x <img src=x onerror=alert(1) x<1> then' }),
  ).toEqual(['HTML_TAGS'])

  expect(
    codes({
      source: 'Si a<b alors',
      target: 'If a<b x<1 onmouseover=alert(1) style=position:fixed;inset:0>then',
    }),
  ).toEqual(['HTML_TAGS'])

  const source = 'Bienvenue sur @:brand <a href="/aide">Aide</a> {name} {0}'

  for (const href of ['{name}', '{0}']) {
    expect(
      codes({ source, target: `Welcome to @:brand <a href="${href}">Help</a> {name} {0}` }),
    ).toEqual(['LINKS'])
  }

  expect(
    codes({ source, target: `Welcome to @:brand <a href="@:brand{''}">Help</a> {name} {0}` }),
  ).toEqual(['HTML_TAGS', 'LINKS'])
})

test('a failure names a placeholder as the translator wrote it', () => {
  expect(
    checkText({
      source: 'Bonjour {name}',
      target: 'Hello <{name} onmouseover=alert(1)>',
      avoid: [],
    })
      .map(({ message }) => message)
      .join(' '),
  ).toContain('<name onmouseover="alert(1)">')
})

test('a linked text cannot finish a stray < of another text, in either order', () => {
  expect(codes({ source: 'x<i', target: 'x<i' })).toEqual(['HTML_TAGS'])

  expect(
    codes({
      source: 'Vrai si @:ineq alors',
      target: 'True if @:ineq onmouseover=alert(1) style=position:fixed;inset:0>then',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: 'Si x<i @:yes', target: 'If x<i @:yes' })).toEqual(['HTML_TAGS'])
  expect(
    codes({ source: 'oui', target: ' onmouseover=alert(1) style=position:fixed;inset:0>yes' }),
  ).toEqual(['HTML_TAGS'])
  expect(codes({ source: 'Prix > 10 €', target: 'Price > €10' })).toEqual([])
})

test('a vue-i18n comment the source has can be kept, and none can be added or dropped', () => {
  expect(codes({ source: 'Bonjour <!-- note --> toi', target: 'Hello <!-- note --> you' })).toEqual(
    [],
  )
  expect(codes({ source: 'Bonjour toi', target: 'Hello <!-- note --> you' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: 'Bonjour <!-- note --> toi', target: 'Hello you' })).toEqual(['HTML_TAGS'])
})

test('links keep the order of the source, so a confirm link cannot become the cancel one', () => {
  const source = '<a href="{confirm}">Confirmer</a> ou <a href="{cancel}">annuler</a>'

  expect(
    codes({ source, target: '<a href="{confirm}">Confirm</a> or <a href="{cancel}">cancel</a>' }),
  ).toEqual([])

  expect(
    codes({ source, target: '<a href="{cancel}">Confirm</a> or <a href="{confirm}">cancel</a>' }),
  ).toEqual(['LINKS'])
})

test('a comment cannot be closed early to let a tag out', () => {
  const source = 'Bonjour <!-- note --> toi'

  for (const target of [
    'Hello <!--><img src=x onerror=alert(1)>--> you',
    'Hello <!-- note --!><img src=x onerror=alert(1)>--> you',
    'Hello <!---><img src=x onerror=alert(1)>--> you',
  ]) {
    expect(codes({ source, target })).toEqual(['HTML_TAGS'])
  }
})

test('text after a linked text cannot add attributes to a tag the linked text leaves open', () => {
  expect(
    codes({
      source: '@:ineq <b>vrai</b>',
      target: '@:ineq onmouseover=alert(1) style=position:fixed;inset:0 <b>true</b>',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: '@:ineq > 3', target: '@:ineq onmouseover=alert(1) > 3' })).toEqual([
    'HTML_TAGS',
  ])

  expect(codes({ source: '2 + 2 = 4', target: '2 + 2 = 4' })).toEqual([])
})

test('links keep their whole order in every plural form', () => {
  const source =
    '<a href="{confirm}">un</a> <a href="{cancel}">non</a> | <a href="{confirm}">deux</a> <a href="{cancel}">non</a>'

  expect(
    codes({
      source,
      target:
        '<a href="{confirm}">one</a> <a href="{cancel}">no</a> | <a href="{cancel}">two</a> <a href="{confirm}">no</a>',
    }),
  ).toEqual(['LINKS'])

  expect(
    codes({
      source: '<a href="{confirm}">a</a> <a href="{cancel}">b</a> <a href="{confirm}">c</a>',
      target: '<a href="{confirm}">a</a> <a href="{confirm}">c</a> <a href="{cancel}">b</a>',
    }),
  ).toEqual(['LINKS'])
})

test('a > or a comment the source has can be kept in prose', () => {
  expect(
    codes({ source: 'Paramètres > Notifications', target: 'Settings > Notifications' }),
  ).toEqual([])

  expect(
    codes({ source: 'Paramètres › Notifications', target: 'Settings > Notifications' }),
  ).toEqual(['HTML_TAGS'])

  expect(
    checkText({
      source: '<!-- 1 --> {n} lot | <!-- 2 --> {n} lots',
      target: '<!-- 1 --> {n} partia | <!-- 2 --> {n} partie | <!-- 2 --> {n} partii',
      avoid: [],
      language: 'pl',
    }),
  ).toEqual([])
})

test('a title cannot hide markup, and text beside a linked text cannot add a > or a = the source does not have', () => {
  expect(
    codes({
      source: '@:heart <a href="/aide" title="Aide">aide</a>',
      target: '@:heart <a href="/aide" title="><img src=x onerror=alert(1)>">help</a>',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(
    codes({
      source: '@:ineq <b>vrai</b> si a = b',
      target: '@:ineq onmouseover=alert(1) <b>true</b> if a equals b',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(
    codes({ source: '@:tag ici <b>maintenant</b>', target: '@:tag > here <b>now</b>' }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: '1 € vaut 100 points', target: '1 € = 100 points' })).toEqual([
    'HTML_TAGS',
  ])
  expect(codes({ source: '1 € = 100 points', target: '1 € = 100 punktów' })).toEqual([])
  expect(codes({ source: '@:brand si a = b', target: '@:brand if a = b' })).toEqual([])
})

test('plural forms may each keep their own link', () => {
  expect(
    checkText({
      source: '<a href="/un">{n} lot</a> | <a href="/plusieurs">{n} lots</a>',
      target:
        '<a href="/un">{n} partia</a> | <a href="/plusieurs">{n} partie</a> | <a href="/plusieurs">{n} partii</a>',
      avoid: [],
      language: 'pl',
    }),
  ).toEqual([])
})

test('a text cannot end on a < that the next text could turn into a tag, nor hide a = in a comment', () => {
  expect(codes({ source: 'Moins que', target: 'Less than <' })).toEqual(['HTML_TAGS'])

  expect(
    codes({ source: 'Bonjour <!-- note --> toi', target: 'Hello <!-- onerror=alert(1) --> you' }),
  ).toEqual(['HTML_TAGS'])
})

test('no text can carry a script attribute in a comment or at its start, and translating the word before a = is fine', () => {
  expect(
    codes({
      source: 'Prix <!-- note --> HT',
      target: 'details open <!-- ontoggle=alert(1) --> x <',
    }),
  ).toEqual(['HTML_TAGS'])

  expect(
    codes({ source: '@:lt <b>ok</b>', target: '@:lt <!-- onmouseover=alert(5) --> <b>ok</b>' }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: 'Quantité = 3', target: '=alert(4) 3' })).toEqual(['HTML_TAGS'])

  for (const [source, target] of [
    ['Total = {n} €', 'Razem = {n} €'],
    ['Quantité = 3', 'Quantity = 3'],
    ['1 point = 1 €', '1 Punkt = 1 €'],
    ['Frais = 10 %', 'Fee = 10%'],
  ]) {
    expect(codes({ source: source ?? '', target: target ?? '' })).toEqual([])
  }
})

test('a word glued to a linked text fails, so two texts cannot spell an attribute together', () => {
  expect(codes({ source: '@:d @:k', target: '@:d on@:k' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: 'Voir @:brand', target: 'See @:brand' })).toEqual([])
})

test('an attribute name cannot be split across texts', () => {
  expect(codes({ source: '@:d @:k <b>ok</b>', target: '@:d on@:k <b>ok</b>' })).toEqual([
    'HTML_TAGS',
  ])

  expect(codes({ source: '@:d @:k <b>ok</b>', target: '@:d st@:k <b>ok</b>' })).toEqual([
    'HTML_TAGS',
  ])

  expect(codes({ source: '@:d @:e <b>ok</b> = 1', target: '@:d st@:e =noop <b>ok</b>' })).toEqual([
    'HTML_TAGS',
  ])

  expect(codes({ source: 'Data = {date}', target: 'Data = {date}' })).toEqual([])
})

test('nothing can be glued after a linked text either', () => {
  expect(codes({ source: '@:k <b>ok</b>', target: "@:k{'lick'} <b>ok</b>" })).toEqual(['HTML_TAGS'])

  expect(codes({ source: '@:a @:b', target: '@:a@:b' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: '@:a@:b', target: '@:a@:b' })).toEqual([])
  expect(codes({ source: 'Voir @:brand.', target: 'See @:brand.' })).toEqual([])
})

test('a glue the source allows stays on its own linked text', () => {
  const source = '@:d @:k <b>ok</b> = 1'

  expect(codes({ source, target: "@:d @:k{'lick'}=alert(document.domain) <b>ok</b>" })).toEqual([
    'HTML_TAGS',
  ])

  expect(
    codes({ source: '@:d @:k <b>ok</b> (v@:v)', target: '@:d on@:k <b>ok</b> (v @:v)' }),
  ).toEqual(['HTML_TAGS'])

  expect(codes({ source: '@:d @:k (v@:v)', target: '@:d @:k (v@:v)' })).toEqual([])
})

test('a source that does not parse still lets no translation glue a linked text', () => {
  expect(
    codes({ source: 'Écrivez à aide@agorastore.fr', target: "Write to @:k{'lick'}" }).includes(
      'HTML_TAGS',
    ),
  ).toBe(true)
})

test('glue hidden behind an empty literal or a space before = is still glue', () => {
  const source = '@:d @:k <b>ok</b> = 1'

  for (const target of [
    "@:d o{''}@:k{''}=alert(document.domain) <b>ok</b>",
    "@:d @:k{''}lick=alert(document.domain) <b>ok</b>",
    '@:d @:k = alert(document.domain) <b>ok</b>',
  ]) {
    expect(codes({ source, target })).toContain('HTML_TAGS')
  }

  expect(
    codes({ source: '@:d (v@:k) <b>ok</b> = 1', target: "@:d (v @:k{'lick'}=x) <b>ok</b>" }),
  ).toContain('HTML_TAGS')

  expect(codes({ source: 'Contact : aide@agorastore.fr', target: 'Contact: @:k' })).toContain(
    'PLACEHOLDERS',
  )
})

test('a source text that leaves markup open is reported, so a broken source never reaches the app', () => {
  for (const source of ['Si x<i alors', 'Moins que <', 'Note <!--> fin', 'I </3 it']) {
    expect(checkSource({ source }).map(({ code }) => code)).toContain('HTML_TAGS')
  }

  for (const source of [
    'Prix &lt; 10 €',
    'Voir <a href="/aide">l’aide</a>',
    'a < b',
    '1 € = 100 points',
  ]) {
    expect(checkSource({ source })).toEqual([])
  }
})

test('a linked text cannot sit inside a tag, and a source that does not parse is reported with its open markup', () => {
  for (const source of ['Voir <i @:b >', "Voir <i @:{'b'}>", `Voir <i title="@:{'b'}">x</i>`]) {
    expect(checkSource({ source }).map(({ code }) => code)).toContain('HTML_TAGS')
  }

  expect(
    codes({ source: 'Voir <i title="x">y</i> @:b', target: 'See <i title="x" @:b>y</i>' }),
  ).toContain('HTML_TAGS')

  expect(
    checkSource({ source: 'Écrivez à aide@agorastore.fr <i' }).map(({ code }) => code),
  ).toEqual(['SYNTAX', 'HTML_TAGS'])

  expect(checkSource({ source: 'Voir <a href="{url}">le lot</a>' })).toEqual([])
})

test('a source with a comment in a quoted attribute, a raw-text element or an unclosed tag is reported', () => {
  for (const source of [
    `<i title="<!--"><u title='x-->">`,
    '<textarea><!--</textarea><u title=x-->',
    '<style>b{}',
    'Voir <b>gras',
  ]) {
    expect(checkSource({ source }).map(({ code }) => code)).toContain('HTML_TAGS')
  }

  expect(checkSource({ source: 'Voir <b>gras</b> <!-- note --> fin' })).toEqual([])
  expect(
    checkSource({ source: '<a href="mailto:aide@agorastore.fr">' }).map(({ code }) => code),
  ).toContain('SYNTAX')
})

test('a linked text’s name cannot swallow markup, and a < cannot open a tag on a linked text', () => {
  for (const source of [
    'Voir @:b<i title=""',
    'Note @:b<!--',
    'Voir @:aide<br> ici',
    "Voir <@:{'b'}/> ici",
  ]) {
    expect(checkSource({ source }).map(({ code }) => code)).toContain('HTML_TAGS')
  }

  expect(checkSource({ source: 'Voir @:aide <br> ici' })).toEqual([])
})

test('a raw-text element spelled with literals is still found', () => {
  expect(
    checkSource({ source: "{'<'}textarea>x{'<'}/textarea>" }).map(({ code }) => code),
  ).toContain('HTML_TAGS')
})

test('a linked text in a comment is reported as such, and a source failure reads as one', () => {
  const [inComment] = checkSource({ source: 'Voir <!-- @:b --> ici' })

  expect(inComment?.message).toContain('inside a comment')
  expect(inComment?.message).not.toContain('inside a tag')

  const [failure] = checkSource({ source: 'Voir <i @:b > ici' })

  expect(failure?.message.startsWith('The source text leaves markup open:')).toBe(true)
  expect(failure?.message).not.toContain('must match the source text')
  expect(checkSource({ source: 'Voir @:common.save! ici' }).map(({ code }) => code)).toContain(
    'HTML_TAGS',
  )
})

test('a literal-key linked text passes when its name is plain', () => {
  expect(checkSource({ source: "Voir @:{'common.save'} ici" })).toEqual([])
  expect(checkSource({ source: "Voir @:{'b<i'} ici" }).map(({ code }) => code)).toContain(
    'HTML_TAGS',
  )
})

test('a comment cannot start inside a tag', () => {
  expect(checkSource({ source: '<i <!-- @:b -->>x</i>' }).map(({ code }) => code)).toContain(
    'HTML_TAGS',
  )

  expect(codes({ source: '<i>x</i> @:b', target: '<i <!-- @:b -->>x</i>' })).toContain('HTML_TAGS')
})

test('a linked text cannot sit in a comment, and comment words cannot become attributes', () => {
  expect(
    checkSource({ source: 'Note <!-- @:b <i>x</i> --> fin' }).map(({ code }) => code),
  ).toContain('HTML_TAGS')

  expect(
    codes({
      source: 'Note <!-- remarque --> : <i>voir</i> > suite',
      target: 'Note : <i <!-- data-probe -->>voir</i> suite',
    }),
  ).toContain('HTML_TAGS')

  expect(checkSource({ source: "Bienvenue sur @:{'brand'} !" })).toEqual([])
})

test('a comment is removed where it stands, not where its text first appears', () => {
  expect(
    codes({
      source: '<i title="&lt;!-- x --&gt;">a</i> <!-- x -->',
      target: '<i title="<!-- x -->">a</i> <!-- x -->',
    }),
  ).toContain('HTML_TAGS')
})

test('a copy of a comment placed inside a tag does not hide the tag', () => {
  expect(
    codes({
      source: 'Menu > Compte > Profil <!-- haut --> <i>voir</i>',
      target: 'Menu Compte Profil <i <!-- data-probe -->>voir</i> <!-- data-probe -->',
    }),
  ).toContain('HTML_TAGS')

  expect(
    codes({
      source: 'a > b > c > <!-- x = y --> 1 = 2 <i>voir</i> @:b',
      target: 'a b c <i <!-- =" -->>voir" @:b ></i> <!-- =" --> 1 2',
    }),
  ).toContain('HTML_TAGS')
})
