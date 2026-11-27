import { expect, test } from 'vite-plus/test'
import {
  checkText,
  checkWords,
  messageSegments,
  protectMessage,
  restoreMessage,
  smsLength,
  SYNTAXES,
} from '../src/index.ts'

const syntax = SYNTAXES.HANDLEBARS_HTML

function codes(input: { source: string; target: string; avoid?: string[] }) {
  return checkText({ avoid: [], ...input, syntax }).map((failure) => failure.code)
}

test('an email text keeps every placeholder of its source, written as handlebars', () => {
  expect(
    codes({
      source: 'Votre offre de {{amount}} sur « {{{lotName}}} » [[signature]]',
      target: 'Your bid of {{ amount }} on “{{{lotName}}}” [[signature]]',
    }),
  ).toEqual([])

  const failures = checkText({
    source: 'Votre offre de {{amount}} sur « {{lotName}} »',
    target: 'Your bid of {{amount}} on “{{lot}}”',
    avoid: [],
    syntax,
  })

  expect(failures).toEqual([
    {
      code: 'PLACEHOLDERS',
      message:
        'The placeholders must match the source text. Missing from this text: {{lotName}}. Not in the source text: {{lot}}.',
    },
  ])
})

test('a {{ left open is a syntax problem, and vue-i18n braces are plain text in an email', () => {
  expect(codes({ source: 'Bonjour {{firstName}},', target: 'Hello {{firstName},' })).toEqual([
    'SYNTAX',
  ])
  expect(codes({ source: 'Total {amount}', target: 'Total {amount}' })).toEqual([])
})

test('a writer cannot change the markup or a link: tags and attributes must match the source', () => {
  const source = 'Lisez nos <a href="https://agorastore.fr/cgv" class="link">conditions</a>.'

  expect(
    codes({
      source,
      target: 'Read our <a class="link" href="https://agorastore.fr/cgv">terms</a>.',
    }),
  ).toEqual([])
  expect(
    codes({
      source,
      target: 'Read our <a href="https://example.com/terms" class="link">terms</a>.',
    }),
  ).toEqual(['MARKUP'])
  expect(codes({ source, target: 'Read our <b>terms</b>.' })).toEqual(['MARKUP'])
})

test('links start with https:// or mailto:, or are a placeholder', () => {
  expect(
    codes({
      source: '<a href="https://agorastore.fr/aide">ici</a>',
      target: '<a href="javascript:alert(1)">here</a>',
    }),
  ).toEqual(['MARKUP', 'LINKS'])
  expect(
    codes({
      source: '<a href="{{lotUrl}}">Voir</a> <a href="mailto:aide@agorastore.fr">aide</a>',
      target: '<a href="{{lotUrl}}">See</a> <a href="mailto:aide@agorastore.fr">help</a>',
    }),
  ).toEqual([])
})

test('words to avoid are found in the text around placeholders and tags', () => {
  expect(
    codes({
      source: 'Le lot {{lotName}}',
      target: 'Das <b>Grundstück</b> {{lotName}}',
      avoid: ['Grundstück'],
    }),
  ).toEqual(['MARKUP', 'AVOID_WORDS'])
})

test('chips and AI tokens cover the handlebars placeholders', () => {
  const message = 'Bonjour {{ firstName }}, votre lot {{{lotName}}} [[signature]]'

  expect(messageSegments(message, { syntax })).toEqual([
    { placeholder: false, value: 'Bonjour ' },
    { placeholder: true, value: 'firstName' },
    { placeholder: false, value: ', votre lot ' },
    { placeholder: true, value: 'lotName' },
    { placeholder: false, value: ' ' },
    { placeholder: true, value: 'signature' },
  ])

  const { text, tokens } = protectMessage(`${message} <b>!</b>`, { syntax })

  expect(text).toBe('Bonjour ⟦1⟧, votre lot ⟦2⟧ ⟦3⟧ ⟦4⟧!⟦5⟧')
  expect(restoreMessage({ text, tokens }).value).toBe(`${message} <b>!</b>`)
})

test('an SMS with a curly apostrophe switches to Unicode: 70 characters per message', () => {
  const curly =
    'Agorastore : votre offre sur « Renault Kangoo 2017 » a été dépassée. L’enchère se termine le 28/11 à 14h. Enchérir : agst.re/48213'

  expect(smsLength(curly)).toMatchObject({
    alphabet: 'Unicode',
    length: curly.length,
    messages: 2,
    unicodeCharacters: ['«', '»', '’'],
  })
  expect(smsLength('Agorastore: your bid was outbid. Bid again: agst.re/48213')).toMatchObject({
    alphabet: 'GSM-7',
    perMessage: 160,
    messages: 1,
  })
  expect(smsLength('Prix: 10€')).toMatchObject({ alphabet: 'GSM-7', length: 10 })
})

test('checkWords reads an email text without its placeholders and tags', () => {
  expect(
    checkWords({
      source: 'Le lot {{lotName}}',
      target: 'Das <b>Grundstück</b> {{lotName}}',
      avoid: ['Grundstück'],
      keep: [],
      syntax,
    }).map((failure) => failure.code),
  ).toEqual(['AVOID_WORDS'])
})

test('a tag left open is refused: it would turn the rest of the email into a link', () => {
  const source = 'Payez votre facture.'

  expect(
    checkText({
      source,
      target: 'Pay your invoice <a href="https://evil.example/login" ',
      avoid: [],
      syntax,
    }),
  ).toEqual([
    {
      code: 'MARKUP',
      message:
        'The markup and links must match the source text: only a Developer changes them. A tag or comment is left open: <a href="https://evil.example/login".',
    },
  ])

  expect(codes({ source, target: 'Pay <img src="https://tracker.example/p.gif"' })).toEqual([
    'MARKUP',
  ])

  expect(codes({ source: 'Total < 10 €', target: 'Total < 10 €' })).toEqual([])
})

test("a link the source already has is the developers' to fix, not each translation's", () => {
  const source = 'Gérer mes <a href="http://agorastore.fr/notifications">notifications</a>'

  expect(
    codes({
      source,
      target: 'Manage my <a href="http://agorastore.fr/notifications">notifications</a>',
    }),
  ).toEqual([])
})

test('a quoted > inside an attribute does not hide a changed link', () => {
  const source = 'Voir <a href="https://glot.dev/lot">le lot</a>'

  expect(
    codes({ source, target: 'See <a title=">" href="https://evil.example/login">the lot</a>' }),
  ).toEqual(['MARKUP'])

  expect(codes({ source, target: "See <a href='https://glot.dev/lot'>the lot</a>" })).toEqual([])

  expect(codes({ source, target: 'See <a title=">the lot' })).toEqual(['MARKUP'])
})

test('an attribute cannot smuggle a link or a style past the markup check', () => {
  const source = '<a href="https://agorastore.fr/aide">ici</a>'

  for (const target of [
    `<a data-x='href="https://agorastore.fr/aide">' href="https://evil.example/login">here</a>`,
    '<a title=">" style="position:fixed;inset:0" href="https://agorastore.fr/aide">here</a>',
    '<a href="https://agorastore.fr/aide" hidden>here</a>',
  ]) {
    expect(codes({ source, target })).toEqual(['MARKUP'])
  }
})

test('an email text cannot open a comment or a declaration, and keeps a stray < exactly as its source writes it', () => {
  for (const target of [
    'Pay <!-- the rest',
    'Pay <![CDATA[ the rest',
    'Pay <?x the rest',
    'Pay </1 the rest',
  ]) {
    expect(codes({ source: 'Payez la suite', target })).toEqual(['MARKUP'])
  }

  expect(codes({ source: 'Taille {{min}}<{{max}}', target: 'Size {{min}}<{{max}}' })).toEqual([])

  expect(
    codes({ source: 'Prix {{min}}<{{max}} et x<y', target: 'Price {{min}}<{{max}} and x<y' }),
  ).toEqual(['MARKUP'])
})

test('email tags close in the order they open', () => {
  expect(
    codes({
      source: '<b><a href="{{url}}">Voir</a></b>',
      target: '<b><a href="{{url}}">See</b></a>',
    }),
  ).toEqual(['MARKUP'])
})

test('a placeholder cannot become a tag name in an email', () => {
  expect(
    codes({
      source: 'Bonjour {{firstName}}',
      target: 'Hello <{{firstName}} style="position:fixed">',
    }),
  ).toEqual(['MARKUP'])

  expect(codes({ source: 'Si {{a}}<{{b}}', target: 'If {{a}}<{{b}}' })).toEqual([])
})

test('an unescaped placeholder cannot take the place of an escaped one in a link', () => {
  expect(
    codes({
      source: '<a href="{{url}}">Voir</a> {{{body}}}',
      target: '<a href="{{{body}}}">See</a> {{url}}',
    }),
  ).toEqual(['MARKUP'])
})

test('an email comment stays whole, so it cannot be left open to hide the rest of the email', () => {
  const source = '<p>Payez <!--[if mso]><b>x</b><![endif]--> la suite</p>'

  expect(
    codes({ source, target: '<p>Pay <!--[if mso]><b>x</b><![endif]--> the rest</p>' }),
  ).toEqual([])

  expect(codes({ source, target: '<p>Pay <!--[if mso]> the rest <b>x</b></p>' })).toEqual([
    'MARKUP',
  ])
})

test('email links keep the order of the source', () => {
  const source = '<a href="{{confirmUrl}}">Confirmer</a> ou <a href="{{cancelUrl}}">annuler</a>'

  expect(
    codes({
      source,
      target: '<a href="{{cancelUrl}}">Confirm</a> or <a href="{{confirmUrl}}">cancel</a>',
    }),
  ).toEqual(['LINKS'])
})

test('the label of an Outlook button inside a comment can be translated, its markup cannot change', () => {
  const source = '<!--[if mso]><center style="color:#fff">Payer</center><![endif]-->'

  expect(
    codes({ source, target: '<!--[if mso]><center style="color:#fff">Pay</center><![endif]-->' }),
  ).toEqual([])

  expect(
    codes({
      source,
      target: '<!--[if mso]><center style="color:#fff" onclick="x()">Pay</center><![endif]-->',
    }),
  ).toEqual(['MARKUP'])
})

test('a > inside an attribute of an Outlook comment does not hide a changed link', () => {
  const source =
    '<!--[if mso]><v:roundrect title="Lot > voir" href="https://agorastore.fr/lot">Voir</v:roundrect><![endif]-->'

  expect(
    codes({
      source,
      target:
        '<!--[if mso]><v:roundrect title="Lot > voir" href="https://evil.example">See</v:roundrect><![endif]-->',
    }),
  ).toEqual(['MARKUP'])
})

test('a stray tag inside an Outlook comment is compared like the rest of the markup', () => {
  const source =
    '<!--[if mso]><v:roundrect href="https://agorastore.fr/lot">Voir le lot</v:roundrect><![endif]-->'

  expect(
    codes({
      source,
      target:
        '<!--[if mso]><v:roundrect href="https://agorastore.fr/lot"><a href="https://evil.example" See the lot</v:roundrect><![endif]-->',
    }),
  ).toEqual(['MARKUP'])

  expect(
    codes({
      source,
      target:
        '<!--[if mso]><v:roundrect href="https://agorastore.fr/lot">See the lot</v:roundrect><![endif]-->',
    }),
  ).toEqual([])
})
