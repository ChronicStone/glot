import { checkText, flattenMessages, parseJsonFile } from '@glot/checks'
import type { ProjectSource } from '@glot/database'
import { SOURCE_LOCALE_TOKEN } from '@glot/database/constants/projects'
import { hashText } from '@glot/utils/hash'
import { GLOT_REPOSITORY } from '../constants/catalog.constants.ts'
import type { CatalogEntry, CatalogProject } from '../types/catalog.types.ts'
import { reviewLineSchema } from '../validators/review-line.validator.ts'
import { approvalKey } from './approval-key.utils.ts'
import { encodeTextId } from './text-id.utils.ts'

export function sourcePath(options: { pathPattern: string; language: string }) {
  return options.pathPattern.replaceAll(SOURCE_LOCALE_TOKEN, options.language)
}

export function reviewsPath(language: string) {
  return `${GLOT_REPOSITORY.REVIEWS_DIRECTORY}/${language}${GLOT_REPOSITORY.REVIEWS_EXTENSION}`
}

function targetLanguages(project: CatalogProject) {
  return project.languages.filter((language) => language !== project.sourceLanguage)
}

export function catalogPaths(project: CatalogProject) {
  const sources = project.sources.flatMap((source) =>
    source.languages.map((language) => sourcePath({ pathPattern: source.pathPattern, language })),
  )

  return [...new Set([...sources, ...targetLanguages(project).map(reviewsPath)])]
}

function readMessages(options: {
  source: ProjectSource
  files: Map<string, string>
  language: string
}) {
  const path = sourcePath({ pathPattern: options.source.pathPattern, language: options.language })
  const content = options.files.get(path)

  return content === undefined
    ? []
    : flattenMessages(parseJsonFile({ path, content })).filter(({ value }) => value.trim())
}

export function buildEntries(options: { project: CatalogProject; files: Map<string, string> }) {
  const entries: CatalogEntry[] = []

  for (const source of options.project.sources.toSorted((a, b) => a.name.localeCompare(b.name))) {
    const targets = source.languages
      .filter((language) => language !== source.sourceLanguage)
      .map((language) => ({
        language,
        values: new Map(
          readMessages({ source, files: options.files, language }).map(({ path, value }) => [
            JSON.stringify(path),
            value,
          ]),
        ),
      }))

    for (const { path, value } of readMessages({
      source,
      files: options.files,
      language: source.sourceLanguage,
    })) {
      const key = { source: source.name, path }

      entries.push({
        id: encodeTextId(key),
        key,
        sourceLanguage: source.sourceLanguage,
        sourceValue: value,
        sourceHash: hashText(value),
        translations: targets.map((target) => {
          const translated = target.values.get(JSON.stringify(path)) ?? null

          return {
            language: target.language,
            value: translated,
            hash: translated === null ? null : hashText(translated),
            failures:
              translated === null
                ? []
                : checkText({ source: value, target: translated, avoid: [] }),
          }
        }),
      })
    }
  }

  return entries
}

function safeJson(line: string) {
  try {
    const parsed: unknown = JSON.parse(line)

    return parsed
  } catch {
    return null
  }
}

export function parseReleased(options: { project: CatalogProject; files: Map<string, string> }) {
  const released = new Map<string, string>()
  const selfApproved = new Set<string>()

  for (const language of targetLanguages(options.project)) {
    const lines = (options.files.get(reviewsPath(language)) ?? '').split('\n')

    for (const line of lines) {
      const parsed = reviewLineSchema.safeParse(safeJson(line))

      if (parsed.success) {
        const key = approvalKey({
          textId: encodeTextId(parsed.data.key),
          language,
          sourceHash: parsed.data.sourceHash,
          targetHash: parsed.data.targetHash,
        })

        released.set(key, parsed.data.reviewedBy)

        if (parsed.data.selfApproved) {
          selfApproved.add(key)
        }
      }
    }
  }

  return { released, selfApproved }
}
