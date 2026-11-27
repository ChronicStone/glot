import { execFile, spawn } from 'node:child_process'
import { promisify } from 'node:util'
import { DEMO_MERGE, DEMO_SIGN_IN_PATTERN } from '../constants/demo.constants.ts'

const run = promisify(execFile)

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

export function mergeReleases(directory: string) {
  async function git(args: string[]) {
    return run('git', ['-C', directory, ...args]).then(
      ({ stdout }) => ({ ok: true, out: stdout.trim() }),
      () => ({ ok: false, out: '' }),
    )
  }

  async function merge() {
    const release = await git(['rev-parse', '--verify', '--quiet', DEMO_MERGE.RELEASE_BRANCH])

    const merged = await git([
      'merge-base',
      '--is-ancestor',
      DEMO_MERGE.RELEASE_BRANCH,
      DEMO_MERGE.INTO,
    ])

    const head = await git(['symbolic-ref', '--short', 'HEAD'])

    if (!release.ok || merged.ok || head.out !== DEMO_MERGE.INTO) {
      return
    }

    const done = await git(['merge', '--ff-only', DEMO_MERGE.RELEASE_BRANCH])

    process.stdout.write(
      done.ok
        ? `[demo] ${DEMO_MERGE.RELEASE_BRANCH} merged into ${DEMO_MERGE.INTO}, as a developer merges the release pull request\n`
        : `[demo] ${DEMO_MERGE.RELEASE_BRANCH} cannot be fast-forwarded into ${DEMO_MERGE.INTO}\n`,
    )
  }

  const timer = setInterval(merge, DEMO_MERGE.EVERY_MS)

  return {
    stop() {
      clearInterval(timer)
    },
  }
}
