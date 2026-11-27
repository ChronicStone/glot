import { ACTOR_KINDS } from '@glot/auth'
import type { AuthenticatedActor } from '@glot/auth'
import type { Database } from '@glot/database'
import { DEFAULT_LOCALE } from '@glot/database/constants/users'
import { BEARER_PREFIX, AUTHORIZATION_HEADER } from '@glot/contract'
import { env } from '../../../env.ts'
import type { WidgetScope } from '../types/widget.types.ts'
import { readWidgetToken } from '../utils/widget-token.utils.ts'

export class WidgetActorService {
  readonly #db: Database

  constructor(db: Database) {
    this.#db = db
  }

  async resolve(
    request: Request,
  ): Promise<{ actor: AuthenticatedActor; widget: WidgetScope } | null> {
    const origin = request.headers.get('origin') ?? ''
    const authorization = request.headers.get(AUTHORIZATION_HEADER) ?? ''
    const now = new Date()

    const claims = authorization.startsWith(BEARER_PREFIX)
      ? readWidgetToken({
          token: authorization.slice(BEARER_PREFIX.length),
          secret: env.AUTH_SECRET,
          now,
        })
      : null

    if (!claims || claims.origin !== origin) {
      return null
    }

    const session = await this.#db.session.findFirst({
      where: { id: claims.sessionId, userId: claims.userId, expiresAt: { gt: now } },
    })

    const user = session ? await this.#db.user.findFirst({ where: { id: session.userId } }) : null

    if (!session || !user) {
      return null
    }

    return {
      actor: {
        kind: ACTOR_KINDS.PERSON,
        sessionId: session.id,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image ?? null,
          locale: user.locale ?? DEFAULT_LOCALE,
        },
      },
      widget: { projectId: claims.projectId, origin },
    }
  }
}
