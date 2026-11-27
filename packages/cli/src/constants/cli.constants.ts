export const CLI_NAME = 'glot'

export const CLI_EXIT = {
  OK: 0,
  FAILED: 1,
  USAGE: 2,
} as const

export const CLI_COMMANDS = {
  CHECK: 'check',
} as const

export const CITTY_USAGE_ERROR_NAME = 'CLIError'

export const CLI_HELP_FLAGS: readonly string[] = ['--help', '-h']

export const LOCALE_TOKEN = '{locale}'
