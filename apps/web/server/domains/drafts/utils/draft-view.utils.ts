import type { CheckFailure } from '@glot/checks'
import type { Draft } from '@glot/database'

export function draftView(options: { draft: Draft; failures: CheckFailure[] }) {
  const { draft } = options

  return {
    id: draft.id,
    textId: draft.textId,
    language: draft.language,
    value: draft.value,
    authorId: draft.authorId,
    status: draft.status,
    updatedAt: draft.updatedAt,
    failures: options.failures,
  }
}
