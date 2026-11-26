import { AUTHORIZATION_HEADER, BEARER_PREFIX } from '@glot/contract'
import { DEFAULT_LOCALE } from '@glot/database/constants/users'
import { ACTOR_KINDS } from './constants/auth.constants.ts'
import type { AuthenticatedActor, GlotAuth } from './types/auth.types.ts'

export async function resolveAuthenticatedActor(
  auth: GlotAuth,
  headers: Headers,
): Promise<AuthenticatedActor | null> {
  const authorization = headers.get(AUTHORIZATION_HEADER)

  const key = authorization?.startsWith(BEARER_PREFIX)
    ? authorization.slice(BEARER_PREFIX.length)
    : undefined

  if (key) {
    const verified = await auth.api.verifyApiKey({ body: { key } })

    return verified.valid && verified.key
      ? { kind: ACTOR_KINDS.KEY, userId: verified.key.referenceId, keyId: verified.key.id }
      : null
  }

  const session = await auth.api.getSession({ headers })

  return session
    ? {
        kind: ACTOR_KINDS.PERSON,
        sessionId: session.session.id,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image ?? null,
          locale: session.user.locale ?? DEFAULT_LOCALE,
        },
      }
    : null
}
