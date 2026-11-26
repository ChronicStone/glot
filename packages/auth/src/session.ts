import type { AuthenticatedActor, GlotAuth } from './types/auth.types.ts'

export async function resolveAuthenticatedActor(
  auth: GlotAuth,
  headers: Headers,
): Promise<AuthenticatedActor | null> {
  const bearer = headers.get('authorization')?.match(/^Bearer (.+)$/u)?.[1]

  if (bearer) {
    const verified = await auth.api.verifyApiKey({ body: { key: bearer } })

    return verified.valid && verified.key
      ? { kind: 'key', userId: verified.key.referenceId, keyId: verified.key.id }
      : null
  }

  const session = await auth.api.getSession({ headers })

  return session
    ? {
        kind: 'person',
        sessionId: session.session.id,
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image ?? null,
          locale: session.user.locale ?? 'en',
        },
      }
    : null
}
