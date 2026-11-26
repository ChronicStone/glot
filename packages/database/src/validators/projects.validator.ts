import { createInsertSchema, createSelectSchema } from 'drizzle-orm/zod'
import * as z from 'zod'
import { SOURCE_KINDS } from '../constants/projects.constants.ts'
import {
  projectAppSources,
  projectApps,
  projectSources,
  projects,
} from '../schemas/projects/projects.schema.ts'

export const projectSelectSchema = createSelectSchema(projects)
export const projectInsertSchema = createInsertSchema(projects)
export const projectAppSelectSchema = createSelectSchema(projectApps)
export const sourceKindSchema = z.enum(SOURCE_KINDS)

export const projectSourceSelectSchema = createSelectSchema(projectSources, {
  kind: sourceKindSchema,
})

export const projectSourceInsertSchema = createInsertSchema(projectSources, {
  kind: sourceKindSchema,
})

export const projectAppSourceInsertSchema = createInsertSchema(projectAppSources)
