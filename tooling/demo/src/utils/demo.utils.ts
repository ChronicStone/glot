import { spawn } from 'node:child_process'
import { DEMO_SIGN_IN_PATTERN } from '../constants/demo.constants.ts'

export function startService(options: {
  name: string
  command: string[]
  cwd: string
  env: Record<string, string>
}) {
  const [program = 'bun', ...args] = options.command

  const child = spawn(program, args, {
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: true,
  })

  function relay(chunk: Buffer) {
    for (const line of chunk.toString().split('\n').filter(Boolean)) {
      const link = DEMO_SIGN_IN_PATTERN.exec(line)

      process.stdout.write(
        link ? `\n  → Sign in as ${link[1]}: ${link[2]}\n\n` : `[${options.name}] ${line}\n`,
      )
    }
  }

  child.stdout.on('data', relay)
  child.stderr.on('data', relay)

  return {
    stop() {
      if (child.pid && child.exitCode === null) {
        process.kill(-child.pid, 'SIGTERM')
      }
    },
  }
}

export async function waitForUrl(url: string) {
  for (let attempt = 0; attempt < 300; attempt += 1) {
    const ready = await fetch(url).then(
      (response) => response.ok,
      () => false,
    )

    if (ready) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`${url} did not answer`)
}
