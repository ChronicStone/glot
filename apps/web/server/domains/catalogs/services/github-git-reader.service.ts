import { GITHUB_API } from '../constants/catalog.constants.ts'
import type { GitPublication, GitReader, GitWriter } from '../types/catalog.types.ts'
import { encodePath } from '../utils/github-path.utils.ts'

export class GithubGitReader implements GitReader, GitWriter {
  readonly #token: string | undefined
  readonly #fetch: typeof fetch
  readonly #apiUrl: string

  constructor(options: { token?: string | undefined; fetch?: typeof fetch; apiUrl?: string }) {
    this.#token = options.token
    this.#fetch = options.fetch ?? fetch
    this.#apiUrl = options.apiUrl ?? GITHUB_API.URL
  }

  async head(options: { repository: string; branch: string }) {
    const response = await this.#request({
      path: `/repos/${options.repository}/git/ref/heads/${encodePath(options.branch)}`,
    })

    if (!response.ok) {
      throw new Error(
        `GitHub answered ${response.status} for the ${options.branch} branch of ${options.repository}`,
      )
    }

    const ref: { object: { sha: string } } = await response.json()

    return ref.object.sha
  }

  async files(options: { repository: string; commit: string; paths: string[] }) {
    const found = new Map<string, string>()

    await Promise.all(
      options.paths.map(async (path) => {
        const response = await this.#request({
          path: `/repos/${options.repository}/contents/${encodePath(path)}?ref=${options.commit}`,
          accept: GITHUB_API.RAW_MEDIA_TYPE,
        })

        if (response.status === 404) {
          return
        }

        if (!response.ok) {
          throw new Error(`GitHub answered ${response.status} for ${path} of ${options.repository}`)
        }

        found.set(path, await response.text())
      }),
    )

    return found
  }

  async publish(options: GitPublication) {
    if (!this.#token) {
      throw new Error('Releasing needs a GitHub token')
    }

    const repository = `/repos/${options.repository}`

    const base: { tree: { sha: string } } = await this.#json({
      path: `${repository}/git/commits/${options.base.commit}`,
    })

    const tree: { sha: string } = await this.#json({
      method: 'POST',
      path: `${repository}/git/trees`,
      body: {
        base_tree: base.tree.sha,
        tree: [...options.files].map(([path, content]) => ({
          path,
          mode: '100644',
          type: 'blob',
          content,
        })),
      },
    })

    const commit: { sha: string } = await this.#json({
      method: 'POST',
      path: `${repository}/git/commits`,
      body: { message: options.message, tree: tree.sha, parents: [options.base.commit] },
    })

    await this.#moveBranch({ repository, branch: options.branch, commit: commit.sha })

    const owner = options.repository.split('/')[0] ?? ''

    const open: Array<{ number: number }> = await this.#json({
      path: `${repository}/pulls?state=open&head=${encodeURIComponent(`${owner}:${options.branch}`)}`,
    })

    const pullRequest: { number: number; html_url: string } = open[0]
      ? await this.#json({
          method: 'PATCH',
          path: `${repository}/pulls/${open[0].number}`,
          body: options.pullRequest,
        })
      : await this.#json({
          method: 'POST',
          path: `${repository}/pulls`,
          body: { ...options.pullRequest, head: options.branch, base: options.base.branch },
        })

    return {
      commit: commit.sha,
      pullRequest: { number: pullRequest.number, url: pullRequest.html_url },
    }
  }

  async #moveBranch(options: { repository: string; branch: string; commit: string }) {
    const known = await this.#request({
      path: `${options.repository}/git/ref/heads/${encodePath(options.branch)}`,
    })

    if (known.status === 404) {
      await this.#json({
        method: 'POST',
        path: `${options.repository}/git/refs`,
        body: { ref: `refs/heads/${options.branch}`, sha: options.commit },
      })

      return
    }

    if (!known.ok) {
      throw new Error(`GitHub answered ${known.status} for the ${options.branch} branch`)
    }

    await this.#json({
      method: 'PATCH',
      path: `${options.repository}/git/refs/heads/${encodePath(options.branch)}`,
      body: { sha: options.commit, force: true },
    })
  }

  async #json<Body>(options: { method?: string; path: string; body?: object }) {
    const response = await this.#request(options)

    if (!response.ok) {
      throw new Error(
        `GitHub answered ${response.status} for ${options.method ?? 'GET'} ${options.path}`,
      )
    }

    const body: Body = await response.json()

    return body
  }

  #request(options: { method?: string; path: string; accept?: string; body?: object }) {
    return this.#fetch(`${this.#apiUrl}${options.path}`, {
      method: options.method ?? 'GET',
      headers: {
        accept: options.accept ?? GITHUB_API.MEDIA_TYPE,
        'user-agent': GITHUB_API.USER_AGENT,
        'x-github-api-version': GITHUB_API.VERSION,
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(this.#token ? { authorization: `Bearer ${this.#token}` } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    })
  }
}
