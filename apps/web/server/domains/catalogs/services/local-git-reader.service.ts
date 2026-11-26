import { spawn } from 'node:child_process'
import { resolve, sep } from 'node:path'
import type { GitReader } from '../types/catalog.types.ts'
import { parseCatFileBatch } from '../utils/cat-file.utils.ts'

export class LocalGitReader implements GitReader {
  readonly #root: string

  constructor(options: { root: string }) {
    this.#root = resolve(options.root)
  }

  async head(options: { repository: string; branch: string }) {
    const output = await this.#git({
      repository: options.repository,
      args: ['rev-parse', '--verify', '--quiet', `${options.branch}^{commit}`],
    })

    return output.toString('utf8').trim()
  }

  async files(options: { repository: string; commit: string; paths: string[] }) {
    if (options.paths.some((path) => path.includes('\n'))) {
      throw new Error('A path to read cannot contain a line break')
    }

    const output = await this.#git({
      repository: options.repository,
      args: ['cat-file', '--batch'],
      input: options.paths.map((path) => `${options.commit}:${path}\n`).join(''),
    })

    const contents = parseCatFileBatch(output)
    const found = new Map<string, string>()

    for (const [index, path] of options.paths.entries()) {
      const content = contents[index]

      if (typeof content === 'string') {
        found.set(path, content)
      }
    }

    return found
  }

  #git(options: { repository: string; args: string[]; input?: string }) {
    const directory = resolve(this.#root, options.repository)

    if (!directory.startsWith(this.#root + sep)) {
      throw new Error(`${options.repository} is outside the repositories folder`)
    }

    return new Promise<Buffer>((done, fail) => {
      const git = spawn('git', ['-C', directory, ...options.args])
      const output: Buffer[] = []
      const errors: Buffer[] = []

      git.stdout.on('data', (chunk: Buffer) => output.push(chunk))
      git.stderr.on('data', (chunk: Buffer) => errors.push(chunk))
      git.on('error', fail)

      git.on('close', (code) => {
        if (code === 0) {
          done(Buffer.concat(output))
        } else {
          fail(
            new Error(
              `Cannot read ${options.repository}: ${Buffer.concat(errors).toString('utf8').trim() || `git exited with ${code}`}`,
            ),
          )
        }
      })

      git.stdin.on('error', fail)
      git.stdin.end(options.input ?? '')
    })
  }
}
