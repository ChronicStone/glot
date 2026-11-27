import { expect, test } from 'vite-plus/test'
import { pluralForms, pluralLabels } from '../src/runtime/utils/plural.utils.ts'

test('a message splits into its plural forms, spaces around the bar or not', () => {
  expect(pluralForms('{count} partia | {count} partie|{count} partii')).toEqual([
    '{count} partia',
    '{count} partie',
    '{count} partii',
  ])
})

test("with the app's own Polish rule, the forms are labelled with the numbers each covers", () => {
  expect(pluralLabels({ language: 'pl', count: 3, appRule: true })).toEqual([
    '1',
    '2–4, 22–24…',
    '5–21, 25–31…',
  ])
})

test("without a rule of the app's own, the labels follow vue-i18n's default choice", () => {
  expect(pluralLabels({ language: 'pl', count: 3, appRule: false })).toEqual(['0', '1', '2+'])
  expect(pluralLabels({ language: 'en', count: 2, appRule: false })).toEqual(['1', 'other'])
})
