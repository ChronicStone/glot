import { catalog, git } from '../config/catalog.config.ts'
import { database } from '../config/database.config.ts'
import { ReleaseJobsService } from '../domains/releases/services/release-jobs.service.ts'
import { ReleaseRunnerService } from '../domains/releases/services/release-runner.service.ts'
import { RELEASE_CLOCK } from '../domains/releases/constants/releases.constants.ts'
import { env } from '../env.ts'

export default defineNitroPlugin(() => {
  if (!(env.GLOT_CLOCK ? env.GLOT_CLOCK === 'on' : !import.meta.dev)) {
    return
  }

  const jobs = new ReleaseJobsService({
    db: database.db,
    runner: new ReleaseRunnerService({ db: database.db, catalog, git }),
  })

  let ticking = false

  setInterval(() => {
    if (ticking) {
      return
    }

    ticking = true

    jobs
      .tick({ now: new Date() })
      .catch((error: unknown) => console.warn('The release clock failed', error))
      .finally(() => {
        ticking = false
      })
  }, RELEASE_CLOCK.TICK_MS).unref()
})
