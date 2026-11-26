import type { Database, Job } from '@glot/database'
import { JOB_KINDS, JOB_STATUSES } from '@glot/database/constants/jobs'
import { RELEASE_STATUSES, RELEASE_TRIGGERS } from '@glot/database/constants/releases'
import type { CatalogProject } from '../../catalogs/types/catalog.types.ts'
import { RELEASE_CLOCK } from '../constants/releases.constants.ts'
import { slotsOfDay } from '../utils/release-schedule.utils.ts'
import type { ReleaseRunnerService } from './release-runner.service.ts'

export class ReleaseJobsService {
  readonly #db: Database
  readonly #runner: ReleaseRunnerService

  constructor(options: { db: Database; runner: ReleaseRunnerService }) {
    this.#db = options.db
    this.#runner = options.runner
  }

  async tick(options: { now: Date }) {
    const { now } = options

    const projects = await this.#db.projects.findMany({ include: { sources: true } })
    const byId = new Map(projects.map((project) => [project.id, project]))

    await this.#db.jobs.createMany({
      data: projects.flatMap(({ id }) =>
        slotsOfDay(now).map((runAt) => ({ kind: JOB_KINDS.RELEASE, projectId: id, runAt })),
      ),
      skipDuplicates: true,
    })

    await this.#db.jobs.updateMany({
      where: {
        status: JOB_STATUSES.RUNNING,
        startedAt: { lt: new Date(now.getTime() - RELEASE_CLOCK.STUCK_JOB_MS) },
      },
      data: {
        status: JOB_STATUSES.FAILED,
        finishedAt: now,
        error: 'The server stopped during this release',
      },
    })

    const due = await this.#db.jobs.findMany({
      where: { kind: JOB_KINDS.RELEASE, status: JOB_STATUSES.PENDING, runAt: { lte: now } },
      orderBy: { runAt: 'asc' },
    })

    for (const job of due) {
      await this.#perform({ job, project: byId.get(job.projectId), now })
    }

    const open = await this.#db.releases.findMany({ where: { status: RELEASE_STATUSES.OPEN } })

    for (const { projectId } of open) {
      const project = byId.get(projectId)

      if (project) {
        await this.#runner
          .sync({ project, fresh: true })
          .catch((error: unknown) => console.warn('Release check failed', error))
      }
    }
  }

  async #perform(options: { job: Job; project: CatalogProject | undefined; now: Date }) {
    const { job, project, now } = options

    if (!project) {
      return
    }

    const claimed = await this.#db.jobs.updateMany({
      where: { id: job.id, status: JOB_STATUSES.PENDING },
      data: { status: JOB_STATUSES.RUNNING, startedAt: now },
    })

    if (claimed.count === 0) {
      return
    }

    try {
      await this.#runner.run({ project, trigger: RELEASE_TRIGGERS.SCHEDULED, startedById: null })

      await this.#db.jobs.update({
        where: { id: job.id },
        data: { status: JOB_STATUSES.DONE, finishedAt: new Date() },
      })
    } catch (error) {
      await this.#db.jobs.update({
        where: { id: job.id },
        data: {
          status: JOB_STATUSES.FAILED,
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }
}
