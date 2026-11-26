import { GITHUB_API } from '../constants/catalog.constants.ts'
import type { GitReader } from '../types/catalog.types.ts'

export class GithubGitReader implements GitReader {
  readonly #token: string | undefined
  readonly #fetch: typeof fetch
  readonly #apiUrl: string

  constructor(options: { token?: string | undefined; fetch?: typeof fetch; apiUrl?: string }) {
    this.#token = options.token
    this.#fetch = options.fetch ?? fetch
    this.#apiUrl = options.apiUrl ?? GITHUB_API.URL
  }

  async head(options: { repository: string; branch: string }) {
    const response = await this.#get({
      path: `/repos/${options.repository}/git/ref/heads/${options.branch.split('/').map(encodeURIComponent).join('/')}`,
      accept: 'application/vnd.github+json',
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
        const response = await this.#get({
          path: `/repos/${options.repository}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${options.commit}`,
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

  #get(options: { path: string; accept: string }) {
    return this.#fetch(`${this.#apiUrl}${options.path}`, {
      headers: {
        accept: options.accept,
        'user-agent': GITHUB_API.USER_AGENT,
        'x-github-api-version': GITHUB_API.VERSION,
        ...(this.#token ? { authorization: `Bearer ${this.#token}` } : {}),
      },
    })
  }
}
