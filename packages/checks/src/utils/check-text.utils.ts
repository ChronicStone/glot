import { CHECK_CODES } from '../constants/checks.constants.ts'
import {
  MESSAGE_LINK_PREFIXES,
  MESSAGE_LOCALIZED_ATTRIBUTES,
  SYNTAXES,
  TEMPLATE_LINK_PROTOCOLS,
} from '../constants/syntax.constants.ts'
import type { CheckCode, CheckFailure, Syntax } from '../types/checks.types.ts'
import { htmlLinksOf, htmlMarkupOf, htmlTagsNest, strayMarkupOf } from './html.utils.ts'
import { parseMessage, placeholdersOf, plainTextOf } from './message.utils.ts'
import { integerPluralCategories } from './plural.utils.ts'
import { parseTemplate, templatePlainText, templateStrayMarkupOf } from './template.utils.ts'
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

function isTemplateLink(link: string) {
  return (
    link.startsWith('{{') ||
    link.startsWith('[[') ||
    Object.values(TEMPLATE_LINK_PROTOCOLS).some((protocol) =>
      link.toLowerCase().startsWith(protocol),
    )
  )
}

function isMessageLink(link: string) {
  return (
    !link.startsWith('//') &&
    !link.startsWith('/\\') &&
    Object.values(MESSAGE_LINK_PREFIXES).some((prefix) => link.toLowerCase().startsWith(prefix))
  )
}

function markupFailures(input: {
  source: string
  target: string
  stray: string[]
  sourceStray: string[]
  freeValues: readonly string[]
  heading: string
  code: CheckCode
  isLink: (link: string) => boolean
  linkRule: string
}) {
  const failures: CheckFailure[] = []

  const markup = mismatch({
    source: htmlMarkupOf(input.source, { freeValues: input.freeValues }),
    target: htmlMarkupOf(input.target, { freeValues: input.freeValues }),
  })

  const stray = difference({ from: input.stray, without: input.sourceStray })
  const nesting = !markup && htmlTagsNest(input.source) && !htmlTagsNest(input.target)

  if (markup || stray.length > 0 || nesting) {
    failures.push({
      code: input.code,
      message: [
        input.heading,
        ...(stray.length > 0 ? [`A tag or comment is left open: ${stray.join(' ')}.`] : []),
        ...(nesting ? ['The tags close in a different order than they open.'] : []),
        ...(markup ? [markup] : []),
      ].join(' '),
    })
  }

  const sourceLinks = new Set(htmlLinksOf(input.source))

  const refused = htmlLinksOf(input.target).filter(
    (link) => !sourceLinks.has(link) && !input.isLink(link),
  )

  if (refused.length > 0) {
    failures.push({
      code: CHECK_CODES.LINKS,
      message: `${input.linkRule} Not allowed: ${refused.join(' ')}.`,
    })
  }

  return failures
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

  failures.push(
    ...markupFailures({
      source: input.source,
      target: input.target,
      stray: templateStrayMarkupOf(input.target),
      sourceStray: templateStrayMarkupOf(input.source),
      freeValues: [],
      heading: 'The markup and links must match the source text: only a Developer changes them.',
      code: CHECK_CODES.MARKUP,
      isLink: isTemplateLink,
      linkRule: 'A link must start with https:// or mailto:.',
    }),
  )

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

  failures.push(
    ...markupFailures({
      source: input.source,
      target: input.target,
      stray: strayMarkupOf(input.target),
      sourceStray: strayMarkupOf(input.source),
      freeValues: Object.values(MESSAGE_LOCALIZED_ATTRIBUTES),
      heading: 'The HTML tags must match the source text.',
      code: CHECK_CODES.HTML_TAGS,
      isLink: isMessageLink,
      linkRule: 'A link must start with https://, mailto:, / or #.',
    }),
  )

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
