import { CHECK_CODES } from '../constants/checks.constants.ts'
import { SYNTAXES, TEMPLATE_LINK_PROTOCOLS } from '../constants/syntax.constants.ts'
import type { CheckFailure, Syntax } from '../types/checks.types.ts'
import { htmlTagsOf } from './html.utils.ts'
import { parseMessage, placeholdersOf, plainTextOf } from './message.utils.ts'
import { integerPluralCategories } from './plural.utils.ts'
import {
  parseTemplate,
  templateLinksOf,
  templateMarkupOf,
  templatePlainText,
} from './template.utils.ts'
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

function isAllowedLink(link: string) {
  return (
    link.startsWith('{{') ||
    link.startsWith('[[') ||
    Object.values(TEMPLATE_LINK_PROTOCOLS).some((protocol) =>
      link.toLowerCase().startsWith(protocol),
    )
  )
}

function checkTemplate(input: { source: string; target: string; avoid: string[]; keep: string[] }) {
  const target = parseTemplate(input.target)

  if (target.problem) {
    return [{ code: CHECK_CODES.SYNTAX, message: target.problem }]
  }

  const source = parseTemplate(input.source)
  const failures: CheckFailure[] = []

  if (!source.problem) {
    const placeholders = mismatch({ source: source.placeholders, target: target.placeholders })

    if (placeholders) {
      failures.push({
        code: CHECK_CODES.PLACEHOLDERS,
        message: `The placeholders must match the source text. ${placeholders}`,
      })
    }
  }

  const markup = mismatch({
    source: templateMarkupOf(input.source),
    target: templateMarkupOf(input.target),
  })

  if (markup) {
    failures.push({
      code: CHECK_CODES.MARKUP,
      message: `The markup and links must match the source text: only a Developer changes them. ${markup}`,
    })
  }

  const refused = templateLinksOf(input.target).filter((link) => !isAllowedLink(link))

  if (refused.length > 0) {
    failures.push({
      code: CHECK_CODES.LINKS,
      message: `A link must start with https:// or mailto:. Not allowed: ${refused.join(' ')}.`,
    })
  }

  failures.push(
    ...wordFailures({
      sourceText: source.problem ? null : templatePlainText(input.source),
      targetText: templatePlainText(input.target),
      avoid: input.avoid,
      keep: input.keep,
    }),
  )

  return failures
}

export function checkText(input: {
  source: string
  target: string
  avoid: string[]
  keep?: string[]
  syntax?: Syntax
  language?: string
}) {
  if (input.syntax === SYNTAXES.HANDLEBARS_HTML) {
    return checkTemplate({ ...input, keep: input.keep ?? [] })
  }

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

    const languageForms =
      input.language && source.forms.length > 1
        ? integerPluralCategories(input.language).length
        : source.forms.length

    if (target.forms.length !== source.forms.length && target.forms.length !== languageForms) {
      failures.push({
        code: CHECK_CODES.PLURAL_FORMS,
        message:
          languageForms === source.forms.length
            ? `The source text has ${source.forms.length} plural ${source.forms.length === 1 ? 'form' : 'forms'}, separated by |. This text has ${target.forms.length}.`
            : `The source text has ${source.forms.length} plural forms and ${input.language} uses ${languageForms}, separated by |. This text has ${target.forms.length}.`,
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

  failures.push(
    ...wordFailures({
      sourceText: source.problem ? null : plainTextOf(source.forms),
      targetText: plainTextOf(target.forms),
      avoid: input.avoid,
      keep: input.keep ?? [],
    }),
  )

  return failures
}
