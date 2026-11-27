import type {
  Approval,
  Database,
  DatabaseTransaction,
  Release,
  ReleaseTrigger,
} from '@glot/database'
import { DRAFT_STATUSES } from '@glot/database/constants/drafts'
import { RELEASE_STATUSES } from '@glot/database/constants/releases'
import type { CatalogService } from '../../catalogs/services/catalog.service.ts'
import type {
  Catalog,
  CatalogProject,
  GitReader,
  GitWriter,
} from '../../catalogs/types/catalog.types.ts'
import { approvalKey } from '../../catalogs/utils/approval-key.utils.ts'
import { catalogPaths, targetLanguages } from '../../catalogs/utils/catalog.utils.ts'
import { RELEASE_BRANCH } from '../constants/releases.constants.ts'
import type { ReleasePlan } from '../types/releases.types.ts'
import { releaseMessage } from '../utils/release-message.utils.ts'
import { planRelease } from '../utils/release-plan.utils.ts'
import { releaseFiles } from '../utils/release-render.utils.ts'
import { isUnchanged } from '../utils/release-unchanged.utils.ts'

export class ReleaseRunnerService {
  readonly #db: Database
  readonly #catalog: CatalogService
  readonly #git: GitReader & GitWriter

  constructor(options: { db: Database; catalog: CatalogService; git: GitReader & GitWriter }) {
    this.#db = options.db
    this.#catalog = options.catalog
    this.#git = options.git
  }

  async sync(options: { project: CatalogProject; fresh: boolean }) {
    const { project } = options

    const catalog = options.fresh
      ? await this.#catalog.sync(project)
      : await this.#catalog.read(project)

    const languages = targetLanguages(project)

    const drafts = await this.#db.drafts.findMany({
      where: {
        projectId: project.id,
        language: { in: languages },
        status: { in: [DRAFT_STATUSES.APPROVED, DRAFT_STATUSES.CONFLICT] },
      },
      orderBy: { updatedAt: 'asc' },
    })

    const approvals = await this.#db.approvals.findMany({
      where: {
        projectId: project.id,
        language: { in: languages },
        OR: [{ releasedAt: null }, { textId: { in: drafts.map(({ textId }) => textId) } }],
      },
      orderBy: { createdAt: 'asc' },
    })

    const plan = planRelease({ catalog, drafts, approvals, excluded: new Set() })

    await this.#settle({ project, catalog, approvals, plan })

    return { catalog, drafts, approvals, plan }
  }

  run(options: { project: CatalogProject; trigger: ReleaseTrigger; startedById: string | null }) {
    const { project } = options

    return this.#db.transaction(async (tx) => {
      await tx.projects.findFirst({ where: { id: project.id }, lock: { mode: 'noKeyUpdate' } })

      const { catalog, drafts, approvals } = await this.sync({ project, fresh: true })

      const current = await this.#git.files({
        repository: project.repository,
        commit: catalog.commit,
        paths: catalogPaths(project),
      })

      const { plan, files } = releaseFiles({ project, catalog, drafts, approvals, files: current })

      await this.#settle({ project, catalog, approvals, plan })

      if (plan.changes.length === 0 && plan.lines.length === 0) {
        return null
      }

      const open = await tx.releases.findFirst({
        where: { projectId: project.id, status: RELEASE_STATUSES.OPEN },
      })

      if (open && (await this.#carries({ tx, open, catalog, plan }))) {
        return open
      }

      const release = await this.#record({
        tx,
        open,
        plan,
        project,
        catalog,
        trigger: options.trigger,
        startedById: options.startedById,
      })

      const message = releaseMessage(plan)

      const published = await this.#git.publish({
        repository: project.repository,
        branch: RELEASE_BRANCH,
        base: { branch: project.defaultBranch, commit: catalog.commit },
        message: message.commit,
        files,
        pullRequest: { title: message.title, body: message.body },
      })

      return tx.releases
        .update({
          where: { id: release.id },
          data: {
            commit: published.commit,
            pullRequestNumber: published.pullRequest?.number ?? null,
            pullRequestUrl: published.pullRequest?.url ?? null,
          },
        })
        .throw()
    })
  }

  async #carries(options: {
    tx: DatabaseTransaction
    open: Release
    catalog: Catalog
    plan: ReleasePlan
  }) {
    const { tx, open } = options

    return isUnchanged({
      open,
      baseCommit: options.catalog.commit,
      changes: await tx.releaseChanges.findMany({ where: { releaseId: open.id } }),
      carried: await tx.approvals.findMany({ where: { releaseId: open.id, releasedAt: null } }),
      plan: options.plan,
    })
  }

  async #record(options: {
    tx: DatabaseTransaction
    open: Release | null
    plan: ReleasePlan
    project: CatalogProject
    catalog: Catalog
    trigger: ReleaseTrigger
    startedById: string | null
  }) {
    const { tx, plan } = options

    const data = {
      trigger: options.trigger,
      startedById: options.startedById,
      branch: RELEASE_BRANCH,
      baseCommit: options.catalog.commit,
      commit: options.catalog.commit,
      pullRequestNumber: null,
      pullRequestUrl: null,
      changeCount: plan.changes.length,
      approvalCount: plan.lines.length,
    }

    const release = options.open
      ? await tx.releases.update({ where: { id: options.open.id }, data }).throw()
      : await tx.releases.create({ data: { projectId: options.project.id, ...data } })

    await tx.releaseChanges.deleteMany({ where: { releaseId: release.id } })

    await tx.releaseChanges.createMany({
      data: plan.changes.map(({ draft, previousValue }) => ({
        releaseId: release.id,
        draftId: draft.id,
        textId: draft.textId,
        language: draft.language,
        previousValue,
        value: draft.value,
        authorId: draft.authorId,
      })),
    })

    await tx.approvals.updateMany({
      where: { releaseId: release.id, releasedAt: null },
      data: { releaseId: null },
    })

    await tx.approvals.updateMany({
      where: { id: { in: plan.lines.map(({ approvalId }) => approvalId) } },
      data: { releaseId: release.id },
    })

    return release
  }

  async #settle(options: {
    project: CatalogProject
    catalog: Catalog
    approvals: Approval[]
    plan: ReleasePlan
  }) {
    const { catalog, plan } = options
    const now = new Date()

    const inRepository = options.approvals
      .filter(
        (approval) => approval.releasedAt === null && catalog.released.has(approvalKey(approval)),
      )
      .map(({ id }) => id)

    await this.#db.transaction(async (tx) => {
      await tx.drafts.updateMany({
        where: {
          id: { in: plan.landed.map(({ id }) => id) },
          status: { in: [DRAFT_STATUSES.APPROVED, DRAFT_STATUSES.CONFLICT] },
        },
        data: { status: DRAFT_STATUSES.RELEASED },
      })

      await tx.drafts.updateMany({
        where: {
          id: { in: plan.conflicts.map(({ draft }) => draft.id) },
          status: DRAFT_STATUSES.APPROVED,
        },
        data: { status: DRAFT_STATUSES.CONFLICT },
      })

      await tx.approvals.updateMany({
        where: { id: { in: inRepository } },
        data: { releasedAt: now },
      })
    })

    await this.#merge({ project: options.project, catalog, now })
  }

  async #merge(options: { project: CatalogProject; catalog: Catalog; now: Date }) {
    const open = await this.#db.releases.findFirst({
      where: { projectId: options.project.id, status: RELEASE_STATUSES.OPEN },
    })

    if (!open) {
      return
    }

    const languages = targetLanguages(options.project)

    const changes = await this.#db.releaseChanges.findMany({
      where: { releaseId: open.id, language: { in: languages } },
    })
    const values = new Map<string, string | null>()

    for (const entry of options.catalog.entries) {
      for (const translation of entry.translations) {
        values.set(`${entry.id}|${translation.language}`, translation.value)
      }
    }

    const written = changes.every(
      ({ textId, language, value }) => values.get(`${textId}|${language}`) === value,
    )

    const waiting = await this.#db.approvals.count({
      where: { releaseId: open.id, releasedAt: null, language: { in: languages } },
    })

    if (written && waiting === 0) {
      await this.#db.releases.update({
        where: { id: open.id },
        data: { status: RELEASE_STATUSES.MERGED, mergedAt: options.now },
      })
    }
  }
}
