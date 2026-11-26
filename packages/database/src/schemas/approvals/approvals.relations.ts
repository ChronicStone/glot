import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const approvalsRelationsPart = defineRelationsPart(schema, (r) => ({
  approvals: {
    project: r.one.projects({ from: r.approvals.projectId, to: r.projects.id, optional: false }),
    reviewer: r.one.user({ from: r.approvals.reviewerId, to: r.user.id, optional: false }),
  },
}))
