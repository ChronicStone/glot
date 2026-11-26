import type { Database } from '@glot/database'
import { SOURCE_KINDS } from '@glot/database/constants/projects'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { DEMO_REPOSITORY, DEMO_SOURCE } from './fixtures/demo-repository.fixtures.ts'

export async function seedDemoProject(
  db: Database,
  options: { workspaceId: string; repository: string },
) {
  const project = await db.projects.create({
    data: {
      workspaceId: options.workspaceId,
      name: 'Demo apps',
      repository: options.repository,
      sourceLanguage: DEMO_SOURCE.sourceLanguage,
      languages: DEMO_SOURCE.languages,
    },
  })

  const source = await db.projectSources.create({
    data: { projectId: project.id, kind: SOURCE_KINDS.VUE_I18N, ...DEMO_SOURCE },
  })

  for (const name of ['Admin', 'Market']) {
    const app = await db.projectApps.create({
      data: { projectId: project.id, name, widget: true },
    })

    await db.projectAppSources.create({ data: { appId: app.id, sourceId: source.id } })
  }

  return project
}

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

  const project = await seedDemoProject(db, {
    workspaceId: workspace.id,
    repository: DEMO_REPOSITORY,
  })

  return { user: anna, workspace, project }
}
