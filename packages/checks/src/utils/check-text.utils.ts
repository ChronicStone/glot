import { CHECK_CODES } from '../constants/checks.constants.ts'
import type { CheckFailure } from '../types/checks.types.ts'
import { htmlTagsOf } from './html.utils.ts'
import { parseMessage, placeholdersOf } from './message.utils.ts'
import { wordFailures } from './words.utils.ts'

function difference(options: { from: string[]; without: string[] }) {
  const remaining = [...options.without]

  return options.from.filter((item) => {
    const at = remaining.indexOf(item)

    if (at === -1) {
      return true
    }

    remaining.splice(at, 1)

    return false
  })
}

function mismatch(options: { source: string[]; target: string[] }) {
  const missing = difference({ from: options.source, without: options.target })
  const extra = difference({ from: options.target, without: options.source })

  return [
    ...(missing.length > 0 ? [`Missing from this text: ${missing.join(' ')}.`] : []),
    ...(extra.length > 0 ? [`Not in the source text: ${extra.join(' ')}.`] : []),
  ].join(' ')
}

export function checkText(input: {
  source: string
  target: string
  avoid: string[]
  keep?: string[]
}) {
  const target = parseMessage(input.target)

  if (target.problem) {
    return [{ code: CHECK_CODES.SYNTAX, message: target.problem }]
  }

  const source = parseMessage(input.source)
  const failures: CheckFailure[] = []

  if (!source.problem) {
    const placeholders = mismatch({
      source: placeholdersOf(source.forms),
      target: placeholdersOf(target.forms),
    })

    if (placeholders) {
      failures.push({
        code: CHECK_CODES.PLACEHOLDERS,
        message: `The placeholders must match the source text. ${placeholders}`,
      })
    }

    if (source.forms.length !== target.forms.length) {
      failures.push({
        code: CHECK_CODES.PLURAL_FORMS,
        message: `The source text has ${source.forms.length} plural ${source.forms.length === 1 ? 'form' : 'forms'}, separated by |. This text has ${target.forms.length}.`,
      })
    }
  }

  const tags = mismatch({ source: htmlTagsOf(input.source), target: htmlTagsOf(input.target) })

  if (tags) {
    failures.push({
      code: CHECK_CODES.HTML_TAGS,
      message: `The HTML tags must match the source text. ${tags}`,
    })
  }

  failures.push(...wordFailures({ source, target, avoid: input.avoid, keep: input.keep ?? [] }))

  return failures
}
