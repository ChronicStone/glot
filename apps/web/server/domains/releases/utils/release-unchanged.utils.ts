import type { Approval, Release, ReleaseChange } from '@glot/database'
import type { ReleasePlan } from '../types/releases.types.ts'

function sameMembers(options: { left: string[]; right: string[] }) {
  const right = new Set(options.right)

  return options.left.length === right.size && options.left.every((member) => right.has(member))
}

export function isUnchanged(options: {
  open: Release
  baseCommit: string
  changes: ReleaseChange[]
  carried: Approval[]
  plan: ReleasePlan
}) {
  const { plan } = options

  return (
    options.open.baseCommit === options.baseCommit &&
    sameMembers({
      left: options.changes.map(({ textId, language, value }) => `${textId}|${language}|${value}`),
      right: plan.changes.map(({ draft }) => `${draft.textId}|${draft.language}|${draft.value}`),
    }) &&
    sameMembers({
      left: options.carried.map(({ id }) => id),
      right: plan.lines.map(({ approvalId }) => approvalId),
    })
  )
}
