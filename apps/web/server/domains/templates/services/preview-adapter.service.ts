import { ORPCError } from '@orpc/server'
import { PREVIEW_ADAPTER } from '../constants/templates.constants.ts'
import type {
  PreviewAdapterCatalog,
  PreviewAdapterRenderRequest,
  PreviewAdapterSendTestRequest,
} from '@glot/contract'
import {
  previewAdapterCatalogSchema,
  previewAdapterRenderSchema,
  previewAdapterSendTestSchema,
} from '@glot/contract/validators'

export class PreviewAdapterService {
  readonly #known = new Map<string, PreviewAdapterCatalog>()
  readonly #timeoutMs: number

  constructor(options: { timeoutMs: number }) {
    this.#timeoutMs = options.timeoutMs
  }

  async catalog(url: string) {
    try {
      const catalog = previewAdapterCatalogSchema.parse(
        await this.#call({ url, path: PREVIEW_ADAPTER.TEMPLATES_PATH }),
      )

      this.#known.delete(url)
      this.#known.set(url, catalog)

      if (this.#known.size > PREVIEW_ADAPTER.KNOWN_CATALOGS) {
        this.#known.delete(this.#known.keys().next().value ?? url)
      }

      return { catalog, available: true }
    } catch (error) {
      const known = this.#known.get(url)

      if (known) {
        return { catalog: known, available: false }
      }

      throw this.#unavailable(error)
    }
  }

  async render(options: { url: string; request: PreviewAdapterRenderRequest }) {
    try {
      return previewAdapterRenderSchema.parse(
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

  async sendTest(options: { url: string; request: PreviewAdapterSendTestRequest }) {
    try {
      previewAdapterSendTestSchema.parse(
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
      redirect: 'error',
      signal: AbortSignal.timeout(this.#timeoutMs),
    })

    if (!response.ok || !response.body) {
      throw new Error(`The preview adapter answered ${response.status}`)
    }

    const chunks: Uint8Array[] = []
    let size = 0

    for await (const chunk of response.body) {
      size += chunk.byteLength

      if (size > PREVIEW_ADAPTER.MAX_RESPONSE_BYTES) {
        throw new Error('The preview adapter answered more than allowed')
      }

      chunks.push(chunk)
    }

    const payload: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    return payload
  }

  #unavailable(error: unknown) {
    return new ORPCError('BAD_GATEWAY', { cause: error })
  }
}
