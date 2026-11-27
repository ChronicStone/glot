import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const aiRelationsPart = defineRelationsPart(schema, (r) => ({
  aiSettings: {
    workspace: r.one.workspaces({
      from: r.aiSettings.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
  },
  aiKeys: {
    workspace: r.one.workspaces({
      from: r.aiKeys.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
  },
  aiUsage: {
    workspace: r.one.workspaces({
      from: r.aiUsage.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    user: r.one.user({ from: r.aiUsage.userId, to: r.user.id, optional: false }),
  },
  aiFills: {
    job: r.one.jobs({ from: r.aiFills.jobId, to: r.jobs.id, optional: false }),
    project: r.one.projects({ from: r.aiFills.projectId, to: r.projects.id, optional: false }),
    requestedBy: r.one.user({ from: r.aiFills.requestedById, to: r.user.id, optional: false }),
  },
}))
