import { expect, test } from 'vite-plus/test'
import { checkText } from '../src/index.ts'

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

  const failures = checkText({ source, target: 'I accept the <a>terms', avoid: [] })

  expect(failures).toEqual([
    {
      code: 'HTML_TAGS',
      message: 'The HTML tags must match the source text. Missing from this text: </a>.',
    },
  ])

  expect(codes({ source: 'Ligne<br/>suivante', target: 'Next<br>line' })).toEqual(['HTML_TAGS'])
  expect(codes({ source: '<b>{name}</b>', target: '<i>{name}</i>' })).toEqual(['HTML_TAGS'])
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
