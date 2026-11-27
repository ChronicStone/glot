import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { freePort } from './smtp.ts'

export interface SinkStep {
  times?: number
  status?: number
  retryAfter?: number
  raw?: string
  corrupt?: Array<{ id: number; mode: 'drop' | 'duplicate' | 'invent' }>
  usage?: { input: number; output: number }
  stopReason?: string
}

interface Recorded {
  provider: 'anthropic' | 'openai'
  path: string
  headers: Record<string, string>
  body: Record<string, any>
}

const TOKEN = /⟦\d+⟧/u

function readBody(request: IncomingMessage) {
  return new Promise<string>((resolve) => {
    const chunks: Buffer[] = []

    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

function send(options: {
  response: ServerResponse
  status: number
  body: unknown
  headers?: Record<string, string>
}) {
  options.response.writeHead(options.status, {
    'content-type': 'application/json',
    ...options.headers,
  })

  options.response.end(JSON.stringify(options.body))
}

function generate(options: { prompt: string; corrupt: SinkStep['corrupt'] }) {
  const job = JSON.parse(options.prompt) as {
    targetLanguageCode: string
    texts: Array<{ id: number; source: string }>
  }

  return JSON.stringify({
    translations: job.texts.map(({ id, source }) => {
      let text = `[${job.targetLanguageCode}] ${source}`
      const mode = options.corrupt?.find((entry) => entry.id === id)?.mode

      if (mode === 'drop') text = text.replace(TOKEN, '')

      if (mode === 'duplicate') text = `${text} ${text.match(TOKEN)?.[0] ?? ''}`

      if (mode === 'invent') text = `${text} ⟦99⟧`

      return { id, text, reason: 'Recorded answer' }
    }),
  })
}

export async function startAiSink() {
  const scripts = new Map<string, Array<{ step: SinkStep; remaining: number }>>()
  const recorded = new Map<string, Recorded[]>()
  const port = await freePort()

  function next(key: string) {
    const entry = scripts.get(key)?.find(({ remaining }) => remaining > 0)

    if (entry) entry.remaining -= 1

    return entry?.step ?? {}
  }

  async function control(options: {
    request: IncomingMessage
    response: ServerResponse
    url: URL
  }) {
    const [, , kind, key = ''] = options.url.pathname.split('/')

    if (kind === 'script' && options.request.method === 'PUT') {
      const { steps } = JSON.parse(await readBody(options.request)) as { steps: SinkStep[] }

      scripts.set(
        key,
        steps.map((step) => ({ step, remaining: step.times ?? Infinity })),
      )
      recorded.set(key, [])

      return send({ response: options.response, status: 200, body: { ok: true } })
    }

    return send({ response: options.response, status: 200, body: recorded.get(key) ?? [] })
  }

  const server = createServer(async (request, response) => {
    const url = new URL(request.url ?? '/', 'http://sink')

    if (url.pathname.startsWith('/__sink/')) {
      return control({ request, response, url })
    }

    const anthropic = url.pathname === '/v1/messages'

    const key = anthropic
      ? String(request.headers['x-api-key'] ?? '')
      : String(request.headers.authorization ?? '').replace(/^Bearer /u, '')

    const body = JSON.parse((await readBody(request)) || '{}') as Record<string, any>

    recorded.set(key, [
      ...(recorded.get(key) ?? []),
      {
        provider: anthropic ? 'anthropic' : 'openai',
        path: url.pathname,
        headers: {
          'anthropic-version': String(request.headers['anthropic-version'] ?? ''),
          'content-type': String(request.headers['content-type'] ?? ''),
        },
        body,
      },
    ])

    const prompt: string = anthropic ? body.messages?.[0]?.content : body.input

    const valid = anthropic
      ? request.headers['anthropic-version'] === '2023-06-01' &&
        body.model &&
        body.max_tokens &&
        body.messages?.[0]?.role === 'user' &&
        typeof body.system === 'string'
      : body.model && body.max_output_tokens && typeof body.instructions === 'string'

    if (!['/v1/messages', '/v1/responses'].includes(url.pathname) || !key || !valid || !prompt) {
      return send({
        response,
        status: 400,
        body: {
          type: 'error',
          error: { type: 'invalid_request_error', message: 'Bad request shape' },
        },
      })
    }

    const step = next(key)

    if (step.status && step.status !== 200) {
      return send({
        response,
        status: step.status,
        headers: step.retryAfter === undefined ? {} : { 'retry-after': String(step.retryAfter) },
        body: anthropic
          ? {
              type: 'error',
              error: { type: 'api_error', message: `Recorded failure ${step.status}` },
            }
          : { error: { message: `Recorded failure ${step.status}` } },
      })
    }

    const text = step.raw ?? generate({ prompt, corrupt: step.corrupt })
    const input = step.usage?.input ?? Math.ceil(prompt.length / 4)
    const output = step.usage?.output ?? Math.ceil(text.length / 4)

    return send({
      response,
      status: 200,
      body: anthropic
        ? {
            id: 'msg_recorded',
            type: 'message',
            role: 'assistant',
            model: body.model,
            content: [{ type: 'text', text }],
            stop_reason: step.stopReason ?? 'end_turn',
            usage: { input_tokens: input, output_tokens: output },
          }
        : {
            id: 'resp_recorded',
            object: 'response',
            status: 'completed',
            model: body.model,
            output: [
              { type: 'message', role: 'assistant', content: [{ type: 'output_text', text }] },
            ],
            usage: { input_tokens: input, output_tokens: output },
          },
    })
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}

export async function scriptSink(options: { url: string; key: string; steps: SinkStep[] }) {
  await fetch(`${options.url}/__sink/script/${encodeURIComponent(options.key)}`, {
    method: 'PUT',
    body: JSON.stringify({ steps: options.steps }),
  })
}

export async function sinkRequests(options: { url: string; key: string }) {
  const response = await fetch(`${options.url}/__sink/requests/${encodeURIComponent(options.key)}`)

  return (await response.json()) as Recorded[]
}
