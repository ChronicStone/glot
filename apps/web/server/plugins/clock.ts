import { ai } from '../config/ai.config.ts'
import { auth } from '../config/auth.config.ts'
import { catalog, git } from '../config/catalog.config.ts'
import { database } from '../config/database.config.ts'
import { mailer } from '../config/mail.config.ts'
import { previews } from '../config/templates.config.ts'
import { AI_FILL_CLOCK } from '../domains/ai/constants/ai.constants.ts'
import { AiFillJobsService } from '../domains/ai/services/ai-fill-jobs.service.ts'
import { DigestJobsService } from '../domains/digests/services/digest-jobs.service.ts'
import { RELEASE_CLOCK } from '../domains/releases/constants/releases.constants.ts'
import { ReleaseJobsService } from '../domains/releases/services/release-jobs.service.ts'
import { ReleaseRunnerService } from '../domains/releases/services/release-runner.service.ts'
import { env } from '../env.ts'

export default defineNitroPlugin(() => {
  if (!(env.GLOT_CLOCK ? env.GLOT_CLOCK === 'on' : !import.meta.dev)) {
    return
  }

  const releases = new ReleaseJobsService({
    db: database.db,
    runner: new ReleaseRunnerService({ db: database.db, catalog, git }),
  })

  const digests = mailer
    ? new DigestJobsService({
        context: { auth, db: database.db, catalog, git, ai, previews },
        send: mailer,
        appUrl: env.APP_URL,
      })
    : undefined

  const fills = new AiFillJobsService({
    context: { auth, db: database.db, catalog, git, ai, previews },
  })

  let ticking = false
  let filling = false

  setInterval(() => {
    if (ticking) {
      return
    }

    ticking = true

    const now = new Date()

    releases
      .tick({ now })
      .catch((error: unknown) => console.warn('The release clock failed', error))
      .then(() => digests?.tick({ now }))
      .catch((error: unknown) => console.warn('The digest clock failed', error))
      .finally(() => {
        ticking = false
      })
  }, RELEASE_CLOCK.TICK_MS).unref()

  setInterval(() => {
    if (filling) {
      return
    }

    filling = true

    fills
      .tick({ now: new Date() })
      .catch((error: unknown) => console.warn('The AI fill clock failed', error))
      .finally(() => {
        filling = false
      })
  }, AI_FILL_CLOCK.TICK_MS).unref()
})
