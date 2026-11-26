import { CHECK_CODES } from '../constants/checks.constants.ts'
import type { CheckFailure } from '../types/checks.types.ts'
import { parseMessage, plainTextOf } from './message.utils.ts'

function isLetter(character: string | undefined) {
  return /[\p{L}\p{N}]/u.test(character ?? '')
}

function containsWord(options: { text: string; word: string }) {
  const text = options.text.toLocaleLowerCase()
  const word = options.word.toLocaleLowerCase()
  let at = word === '' ? -1 : text.indexOf(word)

  while (at !== -1) {
    if (!isLetter(text[at - 1]) && !isLetter(text[at + word.length])) {
      return true
    }

    at = text.indexOf(word, at + 1)
  }

  return false
}

export function wordFailures(options: {
  source: ReturnType<typeof parseMessage>
  target: ReturnType<typeof parseMessage>
  avoid: string[]
  keep: string[]
}) {
  const failures: CheckFailure[] = []
  const targetText = plainTextOf(options.target.forms)

  for (const word of options.avoid) {
    if (containsWord({ text: targetText, word })) {
      failures.push({
        code: CHECK_CODES.AVOID_WORDS,
        message: `Avoid “${word}”: the glossary asks for another word.`,
      })
    }
  }

  if (!options.source.problem) {
    const sourceText = plainTextOf(options.source.forms)

    for (const word of options.keep) {
      if (containsWord({ text: sourceText, word }) && !containsWord({ text: targetText, word })) {
        failures.push({
          code: CHECK_CODES.NEVER_TRANSLATE,
          message: `Keep “${word}” as it is: the glossary says it is never translated.`,
        })
      }
    }
  }

  return failures
}

export function checkWords(input: {
  source: string
  target: string
  avoid: string[]
  keep: string[]
}) {
  const target = parseMessage(input.target)

  return target.problem
    ? []
    : wordFailures({
        source: parseMessage(input.source),
        target,
        avoid: input.avoid,
        keep: input.keep,
      })
}
