import { CHECK_CODES } from '../constants/checks.constants.ts'
import {
  MESSAGE_LINK_PROTOCOLS,
  MESSAGE_LOCALIZED_ATTRIBUTES,
  SYNTAXES,
  TEMPLATE_LINK_PROTOCOLS,
} from '../constants/syntax.constants.ts'
import type { CheckCode, CheckFailure, Syntax } from '../types/checks.types.ts'
import {
  bareClosersOf,
  commentMarkupOf,
  equalsTokensOf,
  hasAbruptComment,
  htmlCommentsOf,
  isActiveAttribute,
  linksInsideComments,
  linksInsideTags,
  rawTextElementsOf,
  htmlLinksOf,
  htmlMarkupOf,
  htmlTagsNest,
  markedFreeValuesOf,
  startsWithEquals,
  strayMarkupOf,
  withoutHtmlComments,
} from './html.utils.ts'
import {
  gluedLinksOf,
  hasLinks,
  linkMarkedForms,
  markupInLinkKeys,
  parseMessage,
  placeholdersOf,
  plainTextOf,
  renderedForms,
} from './message.utils.ts'
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

function mergedByCode(failures: CheckFailure[]) {
  return [...Map.groupBy(failures, ({ code }) => code)].map(([code, found]) => ({
    code,
    message: found.map(({ message }) => message).join(' '),
  }))
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
  if (link.startsWith('//') || /[\s\\{}]|@:|&#|&[a-z]+;/iu.test(link)) {
    return false
  }

  return (
    Object.values(MESSAGE_LINK_PROTOCOLS).some((protocol) =>
      link.toLowerCase().startsWith(protocol),
    ) || !/^[^/?#]*:/u.test(link)
  )
}

function markupKey(form: string, freeValues: readonly string[]) {
  return [
    ...htmlMarkupOf(withoutHtmlComments(form), { freeValues }),
    ...htmlCommentsOf(form).map(commentMarkupOf),
  ].join('\n')
}

function sequence(links: string[], keep: Set<string>) {
  return links.filter((link) => keep.has(link)).join('\n')
}

function counterpartIndex(input: {
  source: string[]
  target: string[]
  index: number
  freeValues: readonly string[]
}) {
  if (input.source.length === input.target.length) {
    return input.index
  }

  const key = markupKey(input.target[input.index] ?? '', input.freeValues)
  const found = input.source.findIndex((form) => markupKey(form, input.freeValues) === key)

  return found === -1 ? input.source.length - 1 : found
}

function markupFailures(input: {
  source: string[]
  target: string[]
  links: { source: string[][]; target: string[][] }
  freeValues: readonly string[]
  exactStray: boolean
  proseRules: boolean
  heading: string
  code: CheckCode
  isLink: (link: string) => boolean
  linkRule: string
}) {
  const failures: CheckFailure[] = []
  const source = input.source.map(withoutHtmlComments)
  const target = input.target.map(withoutHtmlComments)
  const sourceStray = source.flatMap(strayMarkupOf)
  const sourceSegments = new Set(sourceStray.map(({ markup }) => markup))
  const sourceClosers = Math.max(0, ...input.source.map(bareClosersOf))
  const sourceTokens = new Set(input.source.flatMap(equalsTokensOf))
  const sourceEquals = Math.max(0, ...input.source.map((form) => equalsTokensOf(form).length))
  const sourceLeadingEquals = input.source.some(startsWithEquals)

  const sourceMarked = new Set(
    input.source.flatMap((form) => markedFreeValuesOf(form, { freeValues: input.freeValues })),
  )

  const problems = new Set<string>()

  if (input.target.some(hasAbruptComment) && !input.source.some(hasAbruptComment)) {
    problems.add('A comment is closed in a way that lets markup out of it.')
  }

  const counterparts = target.map((_, index) =>
    counterpartIndex({
      source: input.source,
      target: input.target,
      index,
      freeValues: input.freeValues,
    }),
  )

  target.forEach((form, index) => {
    const at = counterparts[index] ?? 0
    const counterpartForm = source[at] ?? ''

    const markup = mismatch({
      source: htmlMarkupOf(counterpartForm, { freeValues: input.freeValues }),
      target: htmlMarkupOf(form, { freeValues: input.freeValues }),
    })

    const comments = mismatch({
      source: htmlCommentsOf(input.source[at] ?? '').map(commentMarkupOf),
      target: htmlCommentsOf(input.target[index] ?? '').map(commentMarkupOf),
    })

    const stray = strayMarkupOf(form).filter(
      ({ markup: found }) => !input.exactStray || !sourceSegments.has(found),
    )

    if (input.proseRules && form.endsWith('<')) {
      stray.push({ markup: '<', closed: false })
    }

    if (stray.length > 0) {
      problems.add(
        `A tag or comment is left open: ${stray.map(({ markup: found }) => found).join(' ')}.${input.exactStray ? '' : ' Write &lt; for a less-than sign.'}`,
      )
    }

    if (
      markedFreeValuesOf(form, { freeValues: input.freeValues }).some(
        (value) => !sourceMarked.has(value),
      )
    ) {
      problems.add('A title, alt or label cannot hold < or >.')
    }

    if (input.proseRules && bareClosersOf(input.target[index] ?? '') > sourceClosers) {
      problems.add(
        'A > is not in the source text: it could close a tag. Use › or the sign the source uses.',
      )
    }

    const tokens = equalsTokensOf(input.target[index] ?? '')

    if (
      input.proseRules &&
      (tokens.length > sourceEquals ||
        tokens.some((token) => isActiveAttribute(token) && !sourceTokens.has(token)) ||
        (startsWithEquals(input.target[index] ?? '') && !sourceLeadingEquals))
    ) {
      problems.add('A = is not where the source has it: it could add an attribute.')
    }

    if (comments) {
      problems.add(`The comments must keep the markup of the source text. ${comments}`)
    }

    if (!markup && htmlTagsNest(counterpartForm) && !htmlTagsNest(form)) {
      problems.add('The tags close in a different order than they open.')
    }

    if (markup) {
      problems.add(markup)
    }
  })

  if (problems.size > 0) {
    failures.push({ code: input.code, message: [input.heading, ...problems].join(' ') })
  }

  const sourceLinks = new Set(input.links.source.flat())

  const refused = input.links.target
    .flat()
    .filter((link) => !sourceLinks.has(link) && !input.isLink(link))

  const reordered = input.links.target.some((links, index) => {
    const kept = links.filter((link) => sourceLinks.has(link))
    const present = new Set(kept)

    const candidates =
      input.links.source.length === input.links.target.length
        ? [input.links.source[index] ?? []]
        : input.links.source

    return !candidates.some((candidate) => sequence(candidate, present) === kept.join('\n'))
  })

  if (refused.length > 0) {
    failures.push({
      code: CHECK_CODES.LINKS,
      message: `${input.linkRule} Not allowed: ${refused.join(' ')}.`,
    })
  } else if (reordered) {
    failures.push({
      code: CHECK_CODES.LINKS,
      message: 'The links must keep the order of the source text.',
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
      links: { source: [htmlLinksOf(input.source)], target: [htmlLinksOf(input.target)] },
      freeValues: [],
      exactStray: true,
      proseRules: false,
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

  const sourceForms = source.problem
    ? [input.source]
    : renderedForms(source.forms, { written: false })

  const targetForms = renderedForms(target.forms, { written: false })

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

  const sourceGlued = source.problem ? [] : source.forms.map(gluedLinksOf)

  const gluedApart = target.forms.some((form, index) => {
    const allowed = source.problem
      ? [[]]
      : sourceGlued.length === target.forms.length
        ? [sourceGlued[index] ?? []]
        : sourceGlued

    return !allowed.some(
      (keys) => difference({ from: gluedLinksOf(form), without: keys }).length === 0,
    )
  })

  if (linkMarkedForms(target.forms).some((form) => linksInsideComments(form) > 0)) {
    failures.push({
      code: CHECK_CODES.HTML_TAGS,
      message:
        'A linked text sits inside a comment: its words could close the comment. Move it out of the comment.',
    })
  }

  if (markupInLinkKeys(target.forms)) {
    failures.push({
      code: CHECK_CODES.HTML_TAGS,
      message:
        'A linked text’s name runs into markup (@:key<…): vue-i18n reads it as part of the name. Leave a space after the name.',
    })
  }

  if (linkMarkedForms(target.forms).some((form) => linksInsideTags(form) > 0)) {
    failures.push({
      code: CHECK_CODES.HTML_TAGS,
      message:
        'A linked text sits inside a tag: its words would become attributes. Move it out of the tag.',
    })
  }

  if (source.problem && hasLinks(target.forms)) {
    failures.push({
      code: CHECK_CODES.PLACEHOLDERS,
      message:
        'The source text has a syntax mistake, so a linked text cannot be checked until the source is fixed.',
    })
  }

  if (gluedApart) {
    failures.push({
      code: CHECK_CODES.HTML_TAGS,
      message:
        'A word is glued to a linked text: together they could name an attribute. Leave a space as the source does.',
    })
  }

  failures.push(
    ...markupFailures({
      source: sourceForms,
      target: targetForms,
      links: {
        source: (source.problem
          ? [input.source]
          : renderedForms(source.forms, { written: true })
        ).map(htmlLinksOf),
        target: renderedForms(target.forms, { written: true }).map(htmlLinksOf),
      },
      freeValues: Object.values(MESSAGE_LOCALIZED_ATTRIBUTES),
      exactStray: false,
      proseRules: true,
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

  return mergedByCode(failures)
}

const SOURCE_HEADING = 'The source text leaves markup open:'

export function checkSource(input: { source: string; syntax?: Syntax }) {
  if (input.syntax === SYNTAXES.HANDLEBARS_HTML) {
    return []
  }

  const parsed = parseMessage(input.source)
  const forms = parsed.problem ? [input.source] : renderedForms(parsed.forms, { written: false })

  const markup = parsed.problem
    ? strayMarkupOf(withoutHtmlComments(input.source)).map(({ markup: found }) => found)
    : checkText({
        source: input.source,
        target: input.source,
        avoid: [],
        syntax: SYNTAXES.VUE_I18N,
      })
        .filter(({ code }) => code === CHECK_CODES.HTML_TAGS)
        .map(({ message }) => message.replaceAll('The HTML tags must match the source text. ', ''))

  const problems = [
    ...markup,
    ...(hasAbruptComment(input.source)
      ? ['A comment is closed in a way that lets markup out of it.']
      : []),
    ...(forms.some((form) => !htmlTagsNest(withoutHtmlComments(form)))
      ? ['A tag is not closed, or closes out of order.']
      : []),
    ...[...new Set(forms.flatMap(rawTextElementsOf))].map(
      (name) => `<${name}> holds raw text, not a message: keep it out of translated texts.`,
    ),
  ]

  return [
    ...(parsed.problem ? [{ code: CHECK_CODES.SYNTAX, message: parsed.problem }] : []),
    ...(problems.length > 0
      ? [{ code: CHECK_CODES.HTML_TAGS, message: [SOURCE_HEADING, ...problems].join(' ') }]
      : []),
  ]
}
