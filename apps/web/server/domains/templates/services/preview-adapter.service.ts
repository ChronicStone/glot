import { ORPCError } from '@orpc/server'
import { PREVIEW_ADAPTER } from '../constants/templates.constants.ts'
import type { AdapterCatalog, AdapterRenderRequest } from '../types/templates.types.ts'
import {
  adapterCatalogSchema,
  adapterRenderSchema,
  adapterSendTestSchema,
} from '../validators/preview-adapter.validator.ts'

export class PreviewAdapterService {
  readonly #known = new Map<string, AdapterCatalog>()
  readonly #timeoutMs: number

  constructor(options: { timeoutMs: number }) {
    this.#timeoutMs = options.timeoutMs
  }

  async catalog(url: string) {
    try {
      const catalog = adapterCatalogSchema.parse(
        await this.#call({ url, path: PREVIEW_ADAPTER.TEMPLATES_PATH }),
      )

      this.#known.set(url, catalog)

      return { catalog, available: true }
    } catch (error) {
      const known = this.#known.get(url)

      if (known) {
        return { catalog: known, available: false }
      }

      throw this.#unavailable(error)
    }
  }

  async render(options: { url: string; request: AdapterRenderRequest }) {
    try {
      return adapterRenderSchema.parse(
        await this.#call({
          url: options.url,
          path: PREVIEW_ADAPTER.RENDER_PATH,
          body: options.request,
        }),
      )
    } catch (error) {
      throw this.#unavailable(error)
    }
  }

  async sendTest(options: { url: string; request: AdapterRenderRequest & { to: string } }) {
    try {
      adapterSendTestSchema.parse(
        await this.#call({
          url: options.url,
          path: PREVIEW_ADAPTER.SEND_TEST_PATH,
          body: options.request,
        }),
      )
    } catch (error) {
      throw this.#unavailable(error)
    }
  }

  async #call(options: { url: string; path: string; body?: unknown }): Promise<unknown> {
    const response = await fetch(`${options.url.replace(/\/+$/u, '')}${options.path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: options.body === undefined ? null : JSON.stringify(options.body),
      signal: AbortSignal.timeout(this.#timeoutMs),
    })

    if (!response.ok) {
      throw new Error(`The preview adapter answered ${response.status}`)
    }

    const payload: unknown = await response.json()

    return payload
  }

  #unavailable(error: unknown) {
    return new ORPCError('BAD_GATEWAY', { cause: error })
  }
}
