import { defineCommand } from 'citty'
import { CLI_EXIT } from '../constants/cli.constants.ts'
import { CheckService } from '../services/check.service.ts'

export const checkCommand = defineCommand({
  meta: {
    name: 'check',
    description: 'Checks every translated text of the language files against its source text.',
  },
  args: {
    sources: {
      type: 'positional',
      valueHint: 'pattern',
      description:
        'Where the files are, with {locale} for the language, such as locales/{locale}.json. Give one per source.',
    },
    'source-language': {
      type: 'string',
      required: true,
      valueHint: 'code',
      description: 'The language the texts are written in first, such as fr.',
    },
    languages: {
      type: 'string',
      required: true,
      valueHint: 'codes',
      description: 'Every language of the project, comma separated, such as fr,en,de.',
    },
    avoid: {
      type: 'string',
      valueHint: 'file',
      description: 'A JSON file of words to avoid per language: {"de": ["Grundstück"]}.',
    },
    root: {
      type: 'string',
      default: '.',
      valueHint: 'folder',
      description: 'The repository folder.',
    },
  },
  async run({ args }) {
    const languages = args.languages
      .split(',')
      .map((language) => language.trim())
      .filter(Boolean)

    if (languages.length === 0) {
      throw new Error('--languages needs at least one language code, such as fr,en,de.')
    }

    const { checked, failures } = await new CheckService().run({
      patterns: args._,
      sourceLanguage: args['source-language'],
      languages,
      avoidFile: args.avoid,
      root: args.root,
    })

    const lines = failures.map(
      (failure) => `${failure.path}  ${failure.key}  ${failure.code}  ${failure.message}`,
    )

    lines.push(
      `${checked} ${checked === 1 ? 'text' : 'texts'} checked, ${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}.`,
    )

    process.stdout.write(`${lines.join('\n')}\n`)

    process.exitCode = failures.length > 0 ? CLI_EXIT.FAILED : CLI_EXIT.OK
  },
})
