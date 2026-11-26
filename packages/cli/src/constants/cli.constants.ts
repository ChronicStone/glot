export const CLI_EXIT = {
  OK: 0,
  FAILED: 1,
  USAGE: 2,
} as const

export const CLI_COMMANDS = {
  CHECK: 'check',
} as const

export const LOCALE_TOKEN = '{locale}'

export const CLI_USAGE = [
  'Usage: glot check --source <pattern> --source-language <code> --languages <codes> [options]',
  '',
  'Checks every translated text of the language files against its source text.',
  '',
  '  --source <pattern>         Where the files are, with {locale} for the language. Repeat it for each source.',
  '  --source-language <code>   The language the texts are written in first, such as fr.',
  '  --languages <codes>        Every language of the project, comma separated, such as fr,en,de.',
  '  --avoid <file>             A JSON file of words to avoid per language: {"de": ["Grundstück"]}.',
  '  --root <folder>            The repository folder. Default: the current folder.',
].join('\n')
