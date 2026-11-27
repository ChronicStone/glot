import { createServer } from 'node:http'
import { freePort } from './smtp.ts'

const HUGE_BYTES = 600_000
const DRIP_EVERY_MS = 200

export async function startHostileAdapter(options: { redirectTo: string }) {
  const server = createServer((request, response) => {
    const [, behaviour] = (request.url ?? '/').split('/')

    if (behaviour === 'redirect') {
      response.writeHead(302, { location: `${options.redirectTo}/templates` })
      response.end()

      return
    }

    response.writeHead(200, { 'content-type': 'application/json' })

    if (behaviour === 'huge') {
      response.end(JSON.stringify({ brands: [], templates: [], padding: 'x'.repeat(HUGE_BYTES) }))

      return
    }

    response.write('{')

    const drip = setInterval(() => response.write(' '), DRIP_EVERY_MS)

    response.on('close', () => clearInterval(drip))
  })

  const port = await freePort()

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    url: (behaviour: 'redirect' | 'huge' | 'drip') => `http://127.0.0.1:${port}/${behaviour}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
