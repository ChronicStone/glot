import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const draftsRelationsPart = defineRelationsPart(schema, (r) => ({
  drafts: {
    project: r.one.projects({ from: r.drafts.projectId, to: r.projects.id, optional: false }),
    author: r.one.user({ from: r.drafts.authorId, to: r.user.id, optional: false }),
  },
}))
