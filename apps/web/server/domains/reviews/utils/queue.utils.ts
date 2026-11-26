import { REVIEW_REASONS } from '@glot/contract'
import type { Text } from '@glot/contract'
import type { Approval, Comment, Draft } from '@glot/database'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { hashText } from '@glot/utils/hash'

export function queueItems(options: {
  texts: Text[]
  language: string
  drafts: Draft[]
  changeRequests: Comment[]
  approvals: Approval[]
  hideAuthorId: string | null
}) {
  const { language } = options
  const draftsOf = Map.groupBy(options.drafts, (draft) => draft.textId)
  const approvalsOf = Map.groupBy(options.approvals, (approval) => approval.textId)

  const requested = new Set(
    options.changeRequests.map((comment) => `${comment.textId}|${comment.targetHash}`),
  )

  const items = options.texts.flatMap((text) => {
    const translation = text.translations.find((candidate) => candidate.language === language)
    const sent = draftsOf.get(text.id) ?? []

    if (!translation) {
      return []
    }

    if (sent.length > 0) {
      return sent
        .filter((draft) => draft.authorId !== options.hideAuthorId)
        .map((draft) => ({ reason: REVIEW_REASONS.SENT_FOR_REVIEW, text, draft }))
    }

    if (
      translation.state !== TEXT_STATES.TO_CHECK ||
      translation.value === null ||
      requested.has(`${text.id}|${hashText(translation.value)}`)
    ) {
      return []
    }

    const sourceHash = hashText(text.source.value)

    const sourceChanged = (approvalsOf.get(text.id) ?? []).some(
      (approval) => approval.sourceHash !== sourceHash,
    )

    return [
      {
        reason: sourceChanged ? REVIEW_REASONS.SOURCE_CHANGED : REVIEW_REASONS.TO_CHECK,
        text,
        draft: null,
      },
    ]
  })

  return items.toSorted((a, b) => b.text.shownIn.length - a.text.shownIn.length)
}

export function approvedPairs(options: { texts: Text[]; language: string }) {
  const pairs = new Set<string>()

  for (const text of options.texts) {
    const translation = text.translations.find(({ language }) => language === options.language)

    if (translation?.state === TEXT_STATES.REVIEWED && translation.value !== null) {
      pairs.add(`${hashText(text.source.value)}|${hashText(translation.value)}`)
    }
  }

  return pairs
}

export function isApprovedElsewhere(options: { text: Text; language: string; pairs: Set<string> }) {
  const value = options.text.translations.find(
    ({ language }) => language === options.language,
  )?.value

  return (
    typeof value === 'string' &&
    options.pairs.has(`${hashText(options.text.source.value)}|${hashText(value)}`)
  )
}
