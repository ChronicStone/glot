import { CONFLICT_REASONS } from '@glot/contract'
import type { Approval, Draft } from '@glot/database'
import { hashText } from '@glot/utils/hash'
import type { Catalog, CatalogEntry } from '../../catalogs/types/catalog.types.ts'
import { approvalKey } from '../../catalogs/utils/approval-key.utils.ts'

export function approvedKeys(options: { catalog: Catalog; approvals: Approval[] }) {
  return new Set([...options.catalog.released.keys(), ...options.approvals.map(approvalKey)])
}

export function draftConflict(options: {
  draft: Draft
  entry: CatalogEntry | undefined
  approved: Set<string>
}) {
  const { draft, entry } = options
  const current = entry?.translations.find(({ language }) => language === draft.language)

  if (!entry || !current) {
    return CONFLICT_REASONS.TEXT_REMOVED
  }

  if (draft.baseSourceHash === null) {
    return null
  }

  const key = approvalKey({
    textId: entry.id,
    language: draft.language,
    sourceHash: entry.sourceHash,
    targetHash: hashText(draft.value),
  })

  if (draft.baseSourceHash !== entry.sourceHash && !options.approved.has(key)) {
    return CONFLICT_REASONS.SOURCE_CHANGED
  }

  return draft.baseTargetHash === current.hash ? null : CONFLICT_REASONS.TARGET_CHANGED
}
