import { integerPluralCategories } from '@glot/checks'
import type { GlossaryTerm, Text } from '@glot/contract'
import { TEXT_STATES } from '@glot/database/constants/texts'
import { AI_BATCH } from '../constants/ai.constants.ts'

export const AI_SYSTEM_PROMPT = [
  'You translate the user interface messages of a software product.',
  'You receive one JSON object describing the job and answer with JSON only, no code fence and no text around it: {"translations":[{"id":1,"text":"...","reason":"..."}]} with exactly one entry per text id.',
  'Rules:',
  '- Placeholders, links and HTML tags of a source text are replaced by numbered tokens such as ⟦1⟧. Write every token of a source text exactly once in its translation, unchanged, where the target language needs it. Never write what a token stands for, and never repeat, drop, invent or renumber a token.',
  '- A source with several plural forms separated by "|" gets the same number of forms in its translation, separated by " | ". "pluralCategories" lists the CLDR plural categories of the target language; order the forms the way the source orders its own.',
  '- Use the glossary terms given for the target language, never write a word of "avoidWords", and leave a never-translate term exactly as the source writes it.',
  '- "otherLanguages" holds approved translations of the same text. They are context for meaning and tone only: they show placeholders as {name}, but in your answer use the tokens.',
  '- Use "key" and "shownIn" to judge the context: a button label stays short, a sentence stays a sentence.',
  '- "reason" is one short sentence, under 20 words, saying why this wording, for example which glossary term it follows.',
  '- When "previousProblems" is present, your last answer for that text was refused for those reasons: fix them.',
].join('\n')

const LANGUAGE_NAMES = new Intl.DisplayNames('en', { type: 'language' })

function relevantTerms(options: {
  sourceLanguage: string
  language: string
  glossary: GlossaryTerm[]
  sources: string[]
}) {
  const lowered = options.sources.map((source) => source.toLocaleLowerCase())

  return options.glossary.flatMap((concept) => {
    const source = concept.terms[options.sourceLanguage]
    const target = concept.terms[options.language]

    const words = [source?.term, source?.plural].filter(
      (word): word is string => typeof word === 'string' && word.length > 0,
    )

    return words.some((word) => lowered.some((text) => text.includes(word.toLocaleLowerCase())))
      ? [
          {
            concept: concept.name,
            definition: concept.definition,
            neverTranslate: concept.neverTranslate,
            source: source?.term ?? null,
            target: target ? { term: target.term, plural: target.plural } : null,
          },
        ]
      : []
  })
}

export function translationPrompt(options: {
  sourceLanguage: string
  language: string
  glossary: GlossaryTerm[]
  items: Array<{
    id: number
    text: Text
    protectedText: string
    tokens: string[]
    problems: string[]
  }>
}) {
  const { language, sourceLanguage } = options

  return JSON.stringify({
    sourceLanguage: LANGUAGE_NAMES.of(sourceLanguage) ?? sourceLanguage,
    targetLanguage: LANGUAGE_NAMES.of(language) ?? language,
    targetLanguageCode: language,
    pluralCategories: integerPluralCategories(language),
    glossary: relevantTerms({
      sourceLanguage,
      language,
      glossary: options.glossary,
      sources: options.items.map(({ text }) => text.source.value),
    }),
    avoidWords: [
      ...new Set(options.glossary.flatMap((concept) => concept.terms[language]?.avoid ?? [])),
    ],
    texts: options.items.map(({ id, text, protectedText, tokens, problems }) => ({
      id,
      key: `${text.key.source}: ${text.key.path.join(' › ')}`,
      where: text.where,
      shownIn: text.shownIn,
      source: protectedText,
      tokens: Object.fromEntries(tokens.map((token, index) => [`⟦${index + 1}⟧`, token])),
      pluralForms: protectedText.split('|').length,
      otherLanguages: Object.fromEntries(
        text.translations
          .filter(
            (translation) =>
              translation.language !== language &&
              translation.state === TEXT_STATES.REVIEWED &&
              translation.value !== null,
          )
          .slice(0, AI_BATCH.MAX_REFERENCE_LANGUAGES)
          .map((translation) => [translation.language, translation.value]),
      ),
      ...(problems.length > 0 ? { previousProblems: problems } : {}),
    })),
  })
}
