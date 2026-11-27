import { checkText, flattenMessages, parseJsonFile } from '@glot/checks'
import type { Syntax } from '@glot/checks'
import { LOCALE_TOKEN } from '../constants/cli.constants.ts'
import type { AvoidWords, CatalogFailure } from '../types/cli.types.ts'

export function languagePath(options: { pattern: string; language: string }) {
  return options.pattern.replaceAll(LOCALE_TOKEN, options.language)
}

function messagesOf(options: { files: Map<string, string>; path: string }) {
  const content = options.files.get(options.path)

  return content === undefined
    ? undefined
    : new Map(
        flattenMessages(parseJsonFile({ path: options.path, content }))
          .filter(({ value }) => value.trim())
          .map(({ path, value }) => [JSON.stringify(path), { path, value }]),
      )
}

export function checkCatalog(options: {
  files: Map<string, string>
  pattern: string
  sourceLanguage: string
  languages: string[]
  avoid: AvoidWords
  syntax: Syntax
}) {
  const source = messagesOf({
    files: options.files,
    path: languagePath({ pattern: options.pattern, language: options.sourceLanguage }),
  })

  const failures: CatalogFailure[] = []
  let checked = 0

  for (const language of options.languages.filter((code) => code !== options.sourceLanguage)) {
    const path = languagePath({ pattern: options.pattern, language })
    const target = messagesOf({ files: options.files, path })

    for (const [id, text] of source ?? []) {
      const translated = target?.get(id)

      if (translated === undefined) {
        continue
      }

      checked += 1

      for (const failure of checkText({
        source: text.value,
        target: translated.value,
        avoid: options.avoid[language] ?? [],
        syntax: options.syntax,
      })) {
        failures.push({
          path,
          key: text.path.join('.'),
          language,
          code: failure.code,
          message: failure.message,
        })
      }
    }
  }

  return { checked, failures }
}
