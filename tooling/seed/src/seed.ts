import type { Database } from '@glot/database'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'

export async function seedDemo(db: Database) {
  const anna = await db.user.create({
    data: { id: 'user-anna', name: 'Anna', email: 'anna@glot.test', emailVerified: true },
  })

  const workspace = await db.workspaces.create({ data: { name: 'Demo', slug: 'demo' } })

  await db.workspaceMemberships.create({
    data: {
      workspaceId: workspace.id,
      userId: anna.id,
      role: WORKSPACE_ROLES.REVIEWER,
      languages: ['pl', 'de'],
    },
  })

  const project = await db.projects.create({
    data: {
      workspaceId: workspace.id,
      name: 'Demo apps',
      repository: 'glot/demo',
      sourceLanguage: 'fr',
      languages: ['fr', 'en', 'de', 'pl', 'nl'],
    },
  })

  await db.projectApps.createMany({
    data: [
      { projectId: project.id, name: 'Admin', widget: true },
      { projectId: project.id, name: 'Market', widget: true },
    ],
  })

  return { user: anna, workspace, project }
}
