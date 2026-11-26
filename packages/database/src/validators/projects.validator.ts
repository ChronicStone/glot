import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import {
  projectAppSources,
  projectApps,
  projectSources,
  projects,
  sourceKindEnum,
} from '../schemas/projects/projects.schema.ts'

export const projectSelectSchema = createSelectSchema(projects)
export const projectInsertSchema = createInsertSchema(projects)
export const projectAppSelectSchema = createSelectSchema(projectApps)
export const projectSourceSelectSchema = createSelectSchema(projectSources)
export const projectSourceInsertSchema = createInsertSchema(projectSources)
export const projectAppSourceInsertSchema = createInsertSchema(projectAppSources)
export const sourceKindSchema = createSelectSchema(sourceKindEnum)
