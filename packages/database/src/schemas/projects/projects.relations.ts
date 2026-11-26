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
    sources: r.many.projectSources({ from: r.projects.id, to: r.projectSources.projectId }),
    drafts: r.many.drafts({ from: r.projects.id, to: r.drafts.projectId }),
    approvals: r.many.approvals({ from: r.projects.id, to: r.approvals.projectId }),
  },
  projectApps: {
    project: r.one.projects({ from: r.projectApps.projectId, to: r.projects.id, optional: false }),
    appSources: r.many.projectAppSources({
      from: r.projectApps.id,
      to: r.projectAppSources.appId,
    }),
  },
  projectSources: {
    project: r.one.projects({
      from: r.projectSources.projectId,
      to: r.projects.id,
      optional: false,
    }),
    appSources: r.many.projectAppSources({
      from: r.projectSources.id,
      to: r.projectAppSources.sourceId,
    }),
  },
  projectAppSources: {
    app: r.one.projectApps({
      from: r.projectAppSources.appId,
      to: r.projectApps.id,
      optional: false,
    }),
    source: r.one.projectSources({
      from: r.projectAppSources.sourceId,
      to: r.projectSources.id,
      optional: false,
    }),
  },
}))
