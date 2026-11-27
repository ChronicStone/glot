import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve, sep } from 'node:path'
import { GIT_IDENTITY } from '../constants/catalog.constants.ts'
import type { GitPublication, GitReader, GitWriter } from '../types/catalog.types.ts'
import { parseCatFileBatch } from '../utils/cat-file.utils.ts'

export class LocalGitReader implements GitReader, GitWriter {
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

  async publish(options: GitPublication) {
    const { repository } = options
    const scratch = await mkdtemp(join(tmpdir(), 'glot-index-'))
    const index = { GIT_INDEX_FILE: join(scratch, 'index') }

    const identity = {
      GIT_AUTHOR_NAME: GIT_IDENTITY.NAME,
      GIT_AUTHOR_EMAIL: GIT_IDENTITY.EMAIL,
      GIT_COMMITTER_NAME: GIT_IDENTITY.NAME,
      GIT_COMMITTER_EMAIL: GIT_IDENTITY.EMAIL,
    }

    try {
      await this.#git({ repository, args: ['read-tree', options.base.commit], env: index })

      const entries: string[] = []

      for (const [path, content] of options.files) {
        if (/[\n\t]/u.test(path)) {
          throw new Error('A path to write cannot contain a line break or a tab')
        }

        const blob = await this.#git({
          repository,
          args: ['hash-object', '-w', '--stdin'],
          input: content,
        })

        entries.push(`100644 ${blob.toString('utf8').trim()}\t${path}\n`)
      }

      await this.#git({
        repository,
        args: ['update-index', '--index-info'],
        input: entries.join(''),
        env: index,
      })

      const tree = (await this.#git({ repository, args: ['write-tree'], env: index }))
        .toString('utf8')
        .trim()

      const commit = (
        await this.#git({
          repository,
          args: ['commit-tree', tree, '-p', options.base.commit, '-m', options.message],
          env: identity,
        })
      )
        .toString('utf8')
        .trim()

      await this.#git({ repository, args: ['update-ref', `refs/heads/${options.branch}`, commit] })

      return { commit, pullRequest: null }
    } finally {
      await rm(scratch, { recursive: true, force: true })
    }
  }

  #git(options: {
    repository: string
    args: string[]
    input?: string
    env?: Record<string, string>
  }) {
    const directory = resolve(this.#root, options.repository)

    if (!directory.startsWith(this.#root + sep)) {
      throw new Error(`${options.repository} is outside the repositories folder`)
    }

    return new Promise<Buffer>((done, fail) => {
      const git = spawn('git', ['-C', directory, ...options.args], {
        env: { ...process.env, ...options.env },
      })

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

      git.stdin.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EPIPE') {
          fail(error)
        }
      })
      git.stdin.end(options.input)
    })
  }
}
