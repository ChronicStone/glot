import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import { projectApps, projects } from '../schemas/projects/projects.schema.ts'

export const projectSelectSchema = createSelectSchema(projects)
export const projectInsertSchema = createInsertSchema(projects)
export const projectAppSelectSchema = createSelectSchema(projectApps)
