import { CHECK_CODES } from '../constants/checks.constants.ts'
import {
  MESSAGE_LINK_PROTOCOLS,
  MESSAGE_LOCALIZED_ATTRIBUTES,
  SYNTAXES,
  TEMPLATE_LINK_PROTOCOLS,
} from '../constants/syntax.constants.ts'
import type { CheckCode, CheckFailure, Syntax } from '../types/checks.types.ts'
import { htmlLinksOf, htmlMarkupOf, htmlTagsNest, strayMarkupOf } from './html.utils.ts'
import { parseMessage, placeholdersOf, plainTextOf, renderedForms } from './message.utils.ts'
import { integerPluralCategories } from './plural.utils.ts'
import { parseTemplate, templatePlainText, templateRendered } from './template.utils.ts'
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
  if (link.startsWith('//') || /[\s\\]|&#|&[a-z]+;/iu.test(link)) {
    return false
  }

  return (
    Object.values(MESSAGE_LINK_PROTOCOLS).some((protocol) =>
      link.toLowerCase().startsWith(protocol),
    ) || !/^[^/?#]*:/u.test(link)
  )
}

function markupKey(form: string, freeValues: readonly string[]) {
  return htmlMarkupOf(form, { freeValues }).join('\n')
}

function counterpart(input: {
  source: string[]
  target: string[]
  index: number
  freeValues: readonly string[]
}) {
  const form = input.target[input.index] ?? ''

  if (input.source.length === input.target.length) {
    return input.source[input.index] ?? ''
  }

  const key = markupKey(form, input.freeValues)

  return (
    input.source.find((candidate) => markupKey(candidate, input.freeValues) === key) ??
    input.source.at(-1) ??
    ''
  )
}

function markupFailures(input: {
  source: string[]
  target: string[]
  links: { source: string[]; target: string[] }
  freeValues: readonly string[]
  heading: string
  code: CheckCode
  isLink: (link: string) => boolean
  linkRule: string
}) {
  const failures: CheckFailure[] = []
  const sourceStray = new Set(input.source.flatMap(strayMarkupOf))
  const problems = new Set<string>()

  input.target.forEach((form, index) => {
    const source = counterpart({ ...input, index })

    const markup = mismatch({
      source: htmlMarkupOf(source, { freeValues: input.freeValues }),
      target: htmlMarkupOf(form, { freeValues: input.freeValues }),
    })

    const stray = strayMarkupOf(form).filter((opener) => !sourceStray.has(opener))

    if (stray.length > 0) {
      problems.add(`A tag or comment is left open: ${stray.join(' ')}.`)
    }

    if (!markup && htmlTagsNest(source) && !htmlTagsNest(form)) {
      problems.add('The tags close in a different order than they open.')
    }

    if (markup) {
      problems.add(markup)
    }
  })

  if (problems.size > 0) {
    failures.push({ code: input.code, message: [input.heading, ...problems].join(' ') })
  }

  const sourceLinks = new Set(input.links.source)

  const refused = input.links.target.filter((link) => !sourceLinks.has(link) && !input.isLink(link))

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
      source: [templateRendered(input.source)],
      target: [templateRendered(input.target)],
      links: { source: htmlLinksOf(input.source), target: htmlLinksOf(input.target) },
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
  const sourceForms = source.problem ? [input.source] : renderedForms(source.forms)
  const targetForms = renderedForms(target.forms)

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
      source: sourceForms,
      target: targetForms,
      links: {
        source: sourceForms.flatMap(htmlLinksOf),
        target: targetForms.flatMap(htmlLinksOf),
      },
      freeValues: Object.values(MESSAGE_LOCALIZED_ATTRIBUTES),
      heading: 'The HTML tags must match the source text.',
      code: CHECK_CODES.HTML_TAGS,
      isLink: isMessageLink,
      linkRule: 'A link must start with https:, mailto: or tel:, or be a path on the same site.',
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
