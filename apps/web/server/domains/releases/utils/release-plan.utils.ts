import { CONFLICT_REASONS } from '@glot/contract'
import type { Approval, Draft } from '@glot/database'
import { hashText } from '@glot/utils/hash'
import type { Catalog } from '../../catalogs/types/catalog.types.ts'
import { approvalKey } from '../../catalogs/utils/approval-key.utils.ts'
import { pairKey } from '../../texts/utils/texts.utils.ts'
import type {
  PlannedChange,
  PlannedLine,
  ReleaseConflict,
  ReleasePlan,
} from '../types/releases.types.ts'
import { approvedKeys, draftConflict } from './release-conflict.utils.ts'

export function planRelease(options: {
  catalog: Catalog
  drafts: Draft[]
  approvals: Approval[]
  excluded: Set<string>
}): ReleasePlan {
  const { catalog } = options
  const entries = new Map(catalog.entries.map((entry) => [entry.id, entry]))
  const approved = approvedKeys({ catalog, approvals: options.approvals })
  const changes: PlannedChange[] = []
  const landed: Draft[] = []
  const conflicts: ReleaseConflict[] = []

  for (const draft of options.drafts) {
    const entry = entries.get(draft.textId)
    const current = entry?.translations.find(({ language }) => language === draft.language)

    if (current?.value === draft.value) {
      landed.push(draft)

      continue
    }

    const reason = options.excluded.has(draft.id)
      ? CONFLICT_REASONS.TARGET_CHANGED
      : draftConflict({ draft, entry, approved })

    if (reason !== null) {
      conflicts.push({ draft, reason })
    } else if (entry) {
      changes.push({ draft, entry, previousValue: current?.value ?? null })
    }
  }

  const written = new Map(changes.map(({ draft }) => [pairKey(draft), draft.value]))

  const lines = options.approvals.flatMap((approval): PlannedLine[] => {
    const entry = entries.get(approval.textId)
    const current = entry?.translations.find(({ language }) => language === approval.language)

    if (approval.releasedAt !== null || !entry || !current) {
      return []
    }

    const after = written.get(pairKey(approval)) ?? current.value

    if (
      entry.sourceHash !== approval.sourceHash ||
      after === null ||
      hashText(after) !== approval.targetHash ||
      catalog.released.has(approvalKey(approval))
    ) {
      return []
    }

    return [
      {
        approvalId: approval.id,
        language: approval.language,
        line: {
          key: entry.key,
          sourceHash: approval.sourceHash,
          targetHash: approval.targetHash,
          reviewedBy: approval.reviewerId,
          ...(approval.selfApproved ? { selfApproved: true } : {}),
        },
      },
    ]
  })

  return { changes, landed, conflicts, lines }
}
