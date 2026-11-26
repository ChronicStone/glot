import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const projectsRelationsPart = defineRelationsPart(schema, (r) => ({
  projects: {
    workspace: r.one.workspaces({
      from: r.projects.workspaceId,
      to: r.workspaces.id,
      optional: false,
    }),
    apps: r.many.projectApps({ from: r.projects.id, to: r.projectApps.projectId }),
    drafts: r.many.drafts({ from: r.projects.id, to: r.drafts.projectId }),
    approvals: r.many.approvals({ from: r.projects.id, to: r.approvals.projectId }),
  },
  projectApps: {
    project: r.one.projects({ from: r.projectApps.projectId, to: r.projects.id, optional: false }),
  },
}))
