import { createServer } from 'node:net'
import { SMTPServer } from 'smtp-server'

export function freePort() {
  return new Promise<number>((resolve, reject) => {
    const probe = createServer()
    probe.on('error', reject)

    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address()
      probe.close(() => resolve(typeof address === 'object' && address ? address.port : 0))
    })
  })
}

export function decodeQuotedPrintable(body: string) {
  const bytes = body
    .replace(/=\r?\n/gu, '')
    .replace(/=([0-9A-F]{2})/gu, (_match, hex: string) =>
      String.fromCharCode(Number.parseInt(hex, 16)),
    )

  return Buffer.from(bytes, 'latin1').toString('utf8')
}

function decodeBody(options: { encoding: string; body: string }) {
  if (options.encoding === 'base64') {
    return Buffer.from(options.body, 'base64').toString('utf8')
  }

  return options.encoding === 'quoted-printable'
    ? decodeQuotedPrintable(options.body)
    : options.body
}

function splitHeaders(raw: string) {
  const [head = '', ...rest] = raw.split(/\r?\n\r?\n/u)

  return { head, body: rest.join('\n\n') }
}

function headerOf(options: { head: string; name: string }) {
  const unfolded = options.head.replace(/\r?\n[ \t]+/gu, ' ')

  return (
    unfolded
      .split(/\r?\n/u)
      .find((line) => line.toLowerCase().startsWith(`${options.name.toLowerCase()}:`))
      ?.slice(options.name.length + 1)
      .trim() ?? ''
  )
}

export function parseMail(raw: string) {
  const { head, body } = splitHeaders(raw)
  const boundary = headerOf({ head, name: 'content-type' }).match(/boundary="?([^";\s]+)"?/u)?.[1]

  const parts = boundary
    ? body
        .split(`--${boundary}`)
        .slice(1)
        .filter((part) => !part.startsWith('--'))
        .map((part) => {
          const { head: partHead, body: partBody } = splitHeaders(part.replace(/^\r?\n/u, ''))

          return {
            type: headerOf({ head: partHead, name: 'content-type' }).split(';')[0] ?? '',
            content: decodeBody({
              encoding: headerOf({ head: partHead, name: 'content-transfer-encoding' }),
              body: partBody,
            }),
          }
        })
    : []

  return {
    to: headerOf({ head, name: 'to' }),
    from: headerOf({ head, name: 'from' }),
    subject: headerOf({ head, name: 'subject' }),
    text: parts.find(({ type }) => type === 'text/plain')?.content ?? '',
    html: parts.find(({ type }) => type === 'text/html')?.content ?? '',
  }
}

export async function startSmtpSink() {
  const raw: string[] = []
  const port = await freePort()

  const server = new SMTPServer({
    authOptional: true,
    disabledCommands: ['STARTTLS', 'AUTH'],
    onData(...[stream, , done]) {
      const chunks: Buffer[] = []
      stream.on('data', (chunk: Buffer) => chunks.push(chunk))

      stream.on('end', () => {
        raw.push(Buffer.concat(chunks).toString('utf8'))
        done()
      })
    },
  })

  await new Promise<void>((resolve) => server.listen(port, '127.0.0.1', resolve))

  return {
    url: `smtp://127.0.0.1:${port}`,
    mails: () => raw.map(parseMail),
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  }
}
