import { readFile } from 'node:fs/promises'
import { inject } from 'vite-plus/test'

async function readSignInLink(email: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const log = await readFile(inject('serverLog'), 'utf8')

    const link = [...log.matchAll(new RegExp(`Sign-in link for ${email}: (\\S+)`, 'gu'))].at(
      -1,
    )?.[1]

    if (link) return link
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  throw new Error('No sign-in link was sent')
}

export async function signInByMagicLink(email: string) {
  const baseUrl = inject('baseUrl')

  await fetch(`${baseUrl}/api/auth/sign-in/magic-link`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: baseUrl },
    body: JSON.stringify({ email, callbackURL: '/' }),
  })
  const link = await readSignInLink(email)
  const response = await fetch(link, { redirect: 'manual' })

  return response.headers
    .getSetCookie()
    .map((cookie) => cookie.split(';')[0])
    .join('; ')
}

export function withCookie(cookie: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(init?.headers)
    headers.set('cookie', cookie)

    return fetch(input, { ...init, headers })
  }
}
