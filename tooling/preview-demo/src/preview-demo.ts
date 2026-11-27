import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { PREVIEW_DEMO_PATHS } from './constants/preview-demo.constants.ts'
import { demoCatalog, renderDemo } from './utils/render.utils.ts'
import { renderRequestSchema, sendTestRequestSchema } from './validators/preview-demo.validator.ts'

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.from(chunk))
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8') || 'null')
}

function send(options: { response: ServerResponse; status: number; body: unknown }) {
  options.response.writeHead(options.status, { 'content-type': 'application/json' })
  options.response.end(JSON.stringify(options.body))
}

async function handle(options: {
  request: IncomingMessage
  response: ServerResponse
  onTest: ((line: string) => void) | undefined
}) {
  const { request, response } = options

  if (request.method === 'GET' && request.url === PREVIEW_DEMO_PATHS.TEMPLATES) {
    send({ response, status: 200, body: demoCatalog() })

    return
  }

  if (request.method === 'POST' && request.url === PREVIEW_DEMO_PATHS.RENDER) {
    const parsed = renderRequestSchema.safeParse(await readJson(request))
    const rendered = parsed.success ? renderDemo(parsed.data) : null

    send({
      response,
      status: rendered ? 200 : 404,
      body: rendered ?? { error: 'Unknown template or brand' },
    })

    return
  }

  if (request.method === 'POST' && request.url === PREVIEW_DEMO_PATHS.SEND_TEST) {
    const parsed = sendTestRequestSchema.safeParse(await readJson(request))
    const rendered = parsed.success ? renderDemo(parsed.data) : null

    if (!parsed.success || !rendered) {
      send({ response, status: 404, body: { error: 'Unknown template or brand' } })

      return
    }

    options.onTest?.(
      `Test of ${parsed.data.template} (${parsed.data.brand}, ${parsed.data.language}) to ${parsed.data.to}: ${rendered.subject ?? rendered.text ?? ''}`,
    )

    send({ response, status: 200, body: { sent: true } })

    return
  }

  send({ response, status: 404, body: { error: 'Not found' } })
}

export function startPreviewDemo(options: { port: number; onTest?: (line: string) => void }) {
  const server = createServer((request, response) => {
    handle({ request, response, onTest: options.onTest }).catch(() => {
      send({ response, status: 400, body: { error: 'Bad request' } })
    })
  })

  return new Promise<{ url: string; close: () => Promise<void> }>((resolve) => {
    server.listen(options.port, () => {
      resolve({
        url: `http://localhost:${options.port}`,
        close: () => new Promise((done) => server.close(() => done())),
      })
    })
  })
}
