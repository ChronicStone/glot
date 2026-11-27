import { ACTOR_KINDS } from '@glot/auth'
import type { SendMail } from '@glot/auth'
import type { Job } from '@glot/database'
import { JOB_KINDS, JOB_STATUSES } from '@glot/database/constants/jobs'
import { activeMembershipWhere } from '@glot/database/utils/membership'
import type { RequestContext } from '../../../types/context.types.ts'
import { HomeService } from '../../home/services/home.service.ts'
import { DIGEST_JOB } from '../constants/digests.constants.ts'
import { digestMessage } from '../utils/digest-message.utils.ts'
import { digestSlot } from '../utils/digest-schedule.utils.ts'

export class DigestJobsService {
  readonly #context: Omit<RequestContext, 'actor'>
  readonly #send: SendMail
  readonly #appUrl: string

  constructor(options: { context: Omit<RequestContext, 'actor'>; send: SendMail; appUrl: string }) {
    this.#context = options.context
    this.#send = options.send
    this.#appUrl = options.appUrl
  }

  async tick(options: { now: Date }) {
    const { now } = options
    const runAt = digestSlot(now)

    if (now < runAt) {
      return
    }

    const { db } = this.#context

    const planned = await db.jobs.exists({ where: { kind: JOB_KINDS.DIGEST, runAt } })

    if (!planned) {
      const people = await db.user.findMany({
        where: {
          receivesDigest: true,
          emailVerified: true,
          workspaceMemberships: { some: activeMembershipWhere({ now }) },
        },
      })

      await db.jobs.createMany({
        data: people.map(({ id }) => ({ kind: JOB_KINDS.DIGEST, userId: id, runAt })),
        skipDuplicates: true,
      })
    }

    await db.jobs.updateMany({
      where: {
        kind: JOB_KINDS.DIGEST,
        status: JOB_STATUSES.RUNNING,
        startedAt: { lt: new Date(now.getTime() - DIGEST_JOB.STUCK_MS) },
      },
      data: { status: JOB_STATUSES.FAILED, finishedAt: now, error: DIGEST_JOB.STUCK_ERROR },
    })

    const due = await db.jobs.findMany({
      where: { kind: JOB_KINDS.DIGEST, status: JOB_STATUSES.PENDING, runAt },
      orderBy: { createdAt: 'asc' },
    })

    for (const job of due) {
      await this.#perform({ job, now })
    }
  }

  async #perform(options: { job: Job; now: Date }) {
    const { job, now } = options
    const { db } = this.#context

    if (!job.userId) {
      return
    }

    const claimed = await db.jobs.updateMany({
      where: { id: job.id, status: JOB_STATUSES.PENDING },
      data: { status: JOB_STATUSES.RUNNING, startedAt: now },
    })

    if (claimed.count === 0) {
      return
    }

    try {
      await this.#deliver({ userId: job.userId, now })

      await db.jobs.update({
        where: { id: job.id },
        data: { status: JOB_STATUSES.DONE, finishedAt: new Date() },
      })
    } catch (error) {
      await db.jobs.update({
        where: { id: job.id },
        data: {
          status: JOB_STATUSES.FAILED,
          finishedAt: new Date(),
          error: error instanceof Error ? error.message : String(error),
        },
      })
    }
  }

  async #deliver(options: { userId: string; now: Date }) {
    const { db } = this.#context
    const user = await db.user.findFirst({ where: { id: options.userId } })

    if (!user?.receivesDigest) {
      return
    }

    const home = new HomeService({
      ...this.#context,
      actor: {
        kind: ACTOR_KINDS.PERSON,
        sessionId: null,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          locale: user.locale,
        },
      },
    })

    const memberships = await db.workspaceMemberships.findMany({
      where: { userId: user.id, ...activeMembershipWhere({ now: options.now }) },
      include: { workspace: true },
      orderBy: { createdAt: 'asc' },
    })

    const workspaces = []

    for (const { workspace } of memberships) {
      const overview = await home.overview({ workspaceId: workspace.id })

      if (overview.needsYou.total > 0) {
        workspaces.push({ name: workspace.name, overview })
      }
    }

    if (workspaces.length === 0) {
      return
    }

    await this.#send({
      to: user.email,
      ...digestMessage({ appUrl: this.#appUrl, name: user.name, workspaces }),
    })
  }
}
