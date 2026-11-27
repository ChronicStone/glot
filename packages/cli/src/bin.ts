#!/usr/bin/env node
import { renderUsage, runCommand } from 'citty'
import { checkCommand } from './commands/check.command.ts'
import { glotCommand } from './commands/glot.command.ts'
import {
  CITTY_USAGE_ERROR_NAME,
  CLI_COMMANDS,
  CLI_EXIT,
  CLI_HELP_FLAGS,
  CLI_NAME,
} from './constants/cli.constants.ts'

const rawArgs = process.argv.slice(2)

const usage = await (rawArgs[0] === CLI_COMMANDS.CHECK
  ? renderUsage(checkCommand, { meta: { name: CLI_NAME } })
  : renderUsage(glotCommand))

if (rawArgs.some((argument) => CLI_HELP_FLAGS.includes(argument))) {
  process.stdout.write(`${usage}\n`)
} else {
  try {
    await runCommand(glotCommand, { rawArgs })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)

    const misused = error instanceof Error && error.name === CITTY_USAGE_ERROR_NAME

    process.stderr.write(misused ? `${usage}\n\n${message}\n` : `${message}\n`)

    process.exitCode = CLI_EXIT.USAGE
  }
}
