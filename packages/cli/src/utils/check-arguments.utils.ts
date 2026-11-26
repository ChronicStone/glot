import { parseArgs } from 'node:util'
import { CLI_USAGE } from '../constants/cli.constants.ts'
import type { CheckArguments } from '../types/cli.types.ts'

export function parseCheckArguments(argv: string[]): CheckArguments {
  const { values } = parseArgs({
    args: argv,
    options: {
      source: { type: 'string', multiple: true },
      'source-language': { type: 'string' },
      languages: { type: 'string' },
      avoid: { type: 'string' },
      root: { type: 'string' },
    },
  })

  const languages = values.languages
    ?.split(',')
    .map((language) => language.trim())
    .filter(Boolean)

  if (!values.source?.length || !values['source-language'] || !languages?.length) {
    throw new Error(CLI_USAGE)
  }

  return {
    patterns: values.source,
    sourceLanguage: values['source-language'],
    languages,
    avoidFile: values.avoid,
    root: values.root ?? '.',
  }
}
