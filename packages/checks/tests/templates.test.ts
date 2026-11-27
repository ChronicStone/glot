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
      source: '<a href="javascript:alert(1)">ici</a>',
      target: '<a href="javascript:alert(1)">here</a>',
    }),
  ).toEqual(['LINKS'])
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
