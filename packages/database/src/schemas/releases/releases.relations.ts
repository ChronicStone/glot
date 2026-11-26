import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const releasesRelationsPart = defineRelationsPart(schema, (r) => ({
  releases: {
    project: r.one.projects({ from: r.releases.projectId, to: r.projects.id, optional: false }),
    startedBy: r.one.user({ from: r.releases.startedById, to: r.user.id }),
    changes: r.many.releaseChanges({ from: r.releases.id, to: r.releaseChanges.releaseId }),
  },
  releaseChanges: {
    release: r.one.releases({
      from: r.releaseChanges.releaseId,
      to: r.releases.id,
      optional: false,
    }),
    author: r.one.user({ from: r.releaseChanges.authorId, to: r.user.id }),
  },
}))
