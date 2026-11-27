import { defineCommand } from 'citty'
import { CLI_NAME } from '../constants/cli.constants.ts'
import { checkCommand } from './check.command.ts'

export const glotCommand = defineCommand({
  meta: {
    name: CLI_NAME,
    description: "Glot's checks for a repository's own CI.",
  },
  subCommands: {
    check: checkCommand,
  },
})
