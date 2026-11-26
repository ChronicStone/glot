#!/usr/bin/env node
import { CLI_COMMANDS, CLI_EXIT, CLI_USAGE } from './constants/cli.constants.ts'
import { CheckService } from './services/check.service.ts'
import { parseCheckArguments } from './utils/check-arguments.utils.ts'

const [command, ...argv] = process.argv.slice(2)

if (command !== CLI_COMMANDS.CHECK) {
  console.error(CLI_USAGE)
  process.exitCode = CLI_EXIT.USAGE
} else {
  try {
    const { checked, failures } = await new CheckService().run(parseCheckArguments(argv))

    const lines = failures.map(
      (failure) => `${failure.path}  ${failure.key}  ${failure.code}  ${failure.message}`,
    )

    lines.push(
      `${checked} ${checked === 1 ? 'text' : 'texts'} checked, ${failures.length} ${failures.length === 1 ? 'failure' : 'failures'}.`,
    )

    process.stdout.write(`${lines.join('\n')}\n`)

    process.exitCode = failures.length > 0 ? CLI_EXIT.FAILED : CLI_EXIT.OK
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = CLI_EXIT.USAGE
  }
}
