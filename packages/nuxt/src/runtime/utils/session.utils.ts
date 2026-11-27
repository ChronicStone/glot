import { WIDGET_POPUP, WIDGET_STORAGE, WIDGET_URL_FLAG } from '../constants/widget.constants.ts'
import type { SignInReply, StoredSession, WidgetOptions } from '../types/widget.types.ts'

function readStorage(name: string) {
  try {
    return localStorage.getItem(name)
  } catch {
    return null
  }
}

function writeStorage(options: { name: string; value: string | null }) {
  try {
    if (options.value === null) {
      localStorage.removeItem(options.name)
    } else {
      localStorage.setItem(options.name, options.value)
    }
  } catch {}
}

export function storedSession(project: string): StoredSession | null {
  const raw = readStorage(WIDGET_STORAGE.SESSION + project)
  const session: StoredSession | null = raw ? JSON.parse(raw) : null

  return session && Date.parse(session.expiresAt) > Date.now() ? session : null
}

export function storeSession(options: { project: string; session: StoredSession | null }) {
  writeStorage({
    name: WIDGET_STORAGE.SESSION + options.project,
    value: options.session ? JSON.stringify(options.session) : null,
  })

  if (options.session) {
    writeStorage({ name: WIDGET_STORAGE.SIGNED_BEFORE + options.project, value: '1' })
  }
}

export function isWidgetWanted(project: string) {
  return (
    readStorage(WIDGET_STORAGE.SIGNED_BEFORE + project) === '1' ||
    new URL(location.href).searchParams.has(WIDGET_URL_FLAG)
  )
}

export function openSignIn(options: WidgetOptions) {
  const glot = new URL(options.url)
  const state = crypto.randomUUID()
  const url = new URL(WIDGET_POPUP.PATH, glot)

  url.search = new URLSearchParams({
    origin: location.origin,
    project: options.project,
    state,
  }).toString()

  const popup = window.open(url, WIDGET_POPUP.NAME, WIDGET_POPUP.FEATURES)

  return new Promise<SignInReply>((done, fail) => {
    const watch = setInterval(() => {
      if (!popup || popup.closed) {
        stop()
        fail(new Error('The sign-in window was closed'))
      }
    }, 500)

    function receive(event: MessageEvent<SignInReply>) {
      if (event.origin !== glot.origin || event.source !== popup || event.data?.state !== state) {
        return
      }

      stop()
      done(event.data)
    }

    function stop() {
      clearInterval(watch)
      window.removeEventListener('message', receive)
    }

    window.addEventListener('message', receive)
  })
}
