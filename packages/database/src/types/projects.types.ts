import type { projectApps, projects } from '../schemas/projects/projects.schema.ts'

export type Project = typeof projects.$inferSelect

export type ProjectInsert = typeof projects.$inferInsert

export type ProjectApp = typeof projectApps.$inferSelect
