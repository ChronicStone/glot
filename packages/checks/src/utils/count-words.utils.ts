import { withoutHtmlTags } from './html.utils.ts'
import { messageSegments } from './message.utils.ts'

const WORD_SEGMENTER = new Intl.Segmenter(undefined, { granularity: 'word' })

export function countWords(message: string) {
  const plain = withoutHtmlTags(
    messageSegments(message)
      .filter(({ placeholder }) => !placeholder)
      .map(({ value }) => value)
      .join(' '),
  )

  return [...WORD_SEGMENTER.segment(plain)].filter(({ isWordLike }) => isWordLike).length
}
