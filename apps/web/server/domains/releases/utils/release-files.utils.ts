import type { Draft } from '@glot/database'
import { MESSAGE_FILE } from '../../catalogs/constants/catalog.constants.ts'
import type { CatalogProject } from '../../catalogs/types/catalog.types.ts'
import { reviewsPath, sourcePath } from '../../catalogs/utils/catalog.utils.ts'
import { editMessages } from '../../catalogs/utils/edit-messages.utils.ts'
import { appendReviewLines } from '../../catalogs/utils/review-lines.utils.ts'
import type { PlannedChange, ReleasePlan } from '../types/releases.types.ts'

function messageEdit(change: PlannedChange) {
  return { path: change.entry.key.path, value: change.draft.value }
}

function editFile(options: { content: string; changes: PlannedChange[] }) {
  try {
    return {
      content: editMessages({ content: options.content, edits: options.changes.map(messageEdit) }),
      unwritable: [],
    }
  } catch {
    let content = options.content
    const unwritable: Draft[] = []

    for (const change of options.changes) {
      try {
        content = editMessages({ content, edits: [messageEdit(change)] })
      } catch {
        unwritable.push(change.draft)
      }
    }

    return { content, unwritable }
  }
}

export function renderFiles(options: {
  project: CatalogProject
  plan: ReleasePlan
  files: Map<string, string>
}) {
  const { project, plan } = options
  const sources = new Map(project.sources.map((source) => [source.name, source]))
  const rendered = new Map<string, string>()
  const unwritable: Draft[] = []

  const byPath = Map.groupBy(plan.changes, (change) => {
    const source = sources.get(change.entry.key.source)

    return source
      ? sourcePath({ pathPattern: source.pathPattern, language: change.draft.language })
      : ''
  })

  for (const [path, changes] of byPath) {
    if (path === '') {
      unwritable.push(...changes.map(({ draft }) => draft))

      continue
    }

    const edited = editFile({ content: options.files.get(path) ?? MESSAGE_FILE.EMPTY, changes })

    rendered.set(path, edited.content)
    unwritable.push(...edited.unwritable)
  }

  const linesByLanguage = Map.groupBy(plan.lines, ({ language }) => language)

  for (const [language, lines] of linesByLanguage) {
    const path = reviewsPath(language)

    rendered.set(
      path,
      appendReviewLines({
        content: options.files.get(path) ?? '',
        lines: lines.map(({ line }) => line),
      }),
    )
  }

  return {
    files: new Map([...rendered].filter(([path, content]) => content !== options.files.get(path))),
    unwritable,
  }
}
