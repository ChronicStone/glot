import { countWords } from '@glot/checks'

function volume(rows: Array<{ words: number }>) {
  return { texts: rows.length, words: rows.reduce((sum, { words }) => sum + words, 0) }
}

export function volumesOf(options: {
  drafts: Array<{ authorId: string; language: string; value: string }>
  approvals: Array<{ reviewerId: string; language: string; words: number }>
}) {
  const written = options.drafts.map(({ authorId, language, value }) => ({
    userId: authorId,
    language,
    words: countWords(value),
  }))

  const reviewed = options.approvals.map(({ reviewerId, language, words }) => ({
    userId: reviewerId,
    language,
    words,
  }))

  const userIds = new Set([...written, ...reviewed].map(({ userId }) => userId))

  return {
    totals: { written: volume(written), reviewed: volume(reviewed) },
    people: [...userIds].map((userId) => {
      const writtenByUser = written.filter((row) => row.userId === userId)
      const reviewedByUser = reviewed.filter((row) => row.userId === userId)

      const languages = new Set(
        [...writtenByUser, ...reviewedByUser].map(({ language }) => language),
      )

      return {
        userId,
        written: volume(writtenByUser),
        reviewed: volume(reviewedByUser),
        languages: [...languages]
          .toSorted((a, b) => a.localeCompare(b))
          .map((language) => ({
            language,
            written: volume(writtenByUser.filter((row) => row.language === language)),
            reviewed: volume(reviewedByUser.filter((row) => row.language === language)),
          })),
      }
    }),
  }
}
