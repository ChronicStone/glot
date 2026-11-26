import type { Release, ReleaseChange } from '@glot/database'

export function releaseView(options: { release: Release; startedByName: string | null }) {
  const { release } = options

  return {
    id: release.id,
    status: release.status,
    trigger: release.trigger,
    commit: release.commit,
    pullRequestNumber: release.pullRequestNumber,
    pullRequestUrl: release.pullRequestUrl,
    createdAt: release.createdAt,
    updatedAt: release.updatedAt,
    mergedAt: release.mergedAt,
    startedByName: options.startedByName,
    changes: release.changeCount,
    approvals: release.approvalCount,
  }
}

export function releaseChangeView(options: { change: ReleaseChange; authorName: string | null }) {
  const { change } = options

  return {
    id: change.id,
    textId: change.textId,
    language: change.language,
    previousValue: change.previousValue,
    value: change.value,
    authorName: options.authorName,
    undone: change.undoDraftId !== null,
  }
}
