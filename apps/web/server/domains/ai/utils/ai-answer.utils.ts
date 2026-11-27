import { AI_BATCH } from '../constants/ai.constants.ts'
import { answersSchema } from '../validators/ai-answer.validator.ts'

function candidates(text: string) {
  const unfenced = text.replace(/^\s*```(?:json)?\s*/u, '').replace(/\s*```\s*$/u, '')
  const first = unfenced.indexOf('{')
  const last = unfenced.lastIndexOf('}')

  return [text, unfenced, first >= 0 && last > first ? unfenced.slice(first, last + 1) : '']
}

export function parseAnswers(text: string) {
  for (const candidate of candidates(text)) {
    try {
      const parsed = answersSchema.safeParse(JSON.parse(candidate))

      if (parsed.success) {
        return new Map(
          parsed.data.translations.map(({ id, text: value, reason }) => [
            id,
            { text: value, reason: (reason ?? '').trim().slice(0, AI_BATCH.MAX_REASON_LENGTH) },
          ]),
        )
      }
    } catch {
      continue
    }
  }

  return null
}
