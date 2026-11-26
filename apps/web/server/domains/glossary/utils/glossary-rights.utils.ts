import type { GlossaryTerm } from '@glot/contract'
import type { WorkspaceRole } from '@glot/database/types/workspaces'
import {
  GLOSSARY_ANY_LANGUAGE_ROLES,
  GLOSSARY_OWN_LANGUAGE_ROLES,
} from '../constants/glossary.constants.ts'

export function normalizeTerms(terms: GlossaryTerm['terms']) {
  return Object.fromEntries(
    Object.entries(terms).map(([language, words]) => [
      language,
      { ...words, avoid: [...new Set(words.avoid)] },
    ]),
  )
}

function sameWords(options: {
  before: GlossaryTerm['terms'][string] | undefined
  after: GlossaryTerm['terms'][string] | undefined
}) {
  const { before, after } = options

  return (
    before !== undefined &&
    after !== undefined &&
    before.term === after.term &&
    before.plural === after.plural &&
    before.avoid.length === after.avoid.length &&
    before.avoid.every((word, index) => word === after.avoid[index])
  )
}

export function touchedLanguages(options: {
  before: Omit<GlossaryTerm, 'id' | 'status'> | null
  after: Omit<GlossaryTerm, 'id' | 'status'>
}) {
  const { before, after } = options
  const languages = [...new Set([...Object.keys(before?.terms ?? {}), ...Object.keys(after.terms)])]

  const detailsChanged =
    before === null ||
    before.name !== after.name ||
    before.definition !== after.definition ||
    before.neverTranslate !== after.neverTranslate ||
    before.notes !== after.notes

  return detailsChanged
    ? languages
    : languages.filter(
        (language) => !sameWords({ before: before.terms[language], after: after.terms[language] }),
      )
}

export function mayChangeLanguages(options: {
  role: WorkspaceRole
  languages: string[] | null
  touched: string[]
}) {
  if (Object.values<string>(GLOSSARY_ANY_LANGUAGE_ROLES).includes(options.role)) {
    return true
  }

  const own = options.languages ?? []

  return (
    Object.values<string>(GLOSSARY_OWN_LANGUAGE_ROLES).includes(options.role) &&
    own.length > 0 &&
    options.touched.every((language) => own.includes(language))
  )
}
