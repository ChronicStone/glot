import type { ReviewLine } from '../types/catalog.types.ts'

export function reviewLineText(line: ReviewLine) {
  return JSON.stringify({
    key: line.key,
    sourceHash: line.sourceHash,
    targetHash: line.targetHash,
    reviewedBy: line.reviewedBy,
    ...(line.selfApproved ? { selfApproved: true } : {}),
  })
}

export function appendReviewLines(options: { content: string; lines: ReviewLine[] }) {
  const separator = options.content === '' || options.content.endsWith('\n') ? '' : '\n'

  return `${options.content}${separator}${options.lines.map(reviewLineText).join('\n')}\n`
}
