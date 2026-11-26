import type * as z from 'zod'
import type {
  projectCreateInputSchema,
  projectSchema,
  projectSourceSchema,
  projectSyncInputSchema,
  projectSyncSchema,
  projectUpdateInputSchema,
} from '../validators/projects.validator.ts'

export type ProjectView = z.infer<typeof projectSchema>

export type ProjectSourceView = z.infer<typeof projectSourceSchema>

export type ProjectSync = z.infer<typeof projectSyncSchema>

export type ProjectSyncInput = z.infer<typeof projectSyncInputSchema>

export type ProjectCreateInput = z.infer<typeof projectCreateInputSchema>

export type ProjectUpdateInput = z.infer<typeof projectUpdateInputSchema>
