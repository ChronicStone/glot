import type * as z from 'zod'
import type {
  projectSchema,
  projectSourceSchema,
  projectSyncInputSchema,
  projectSyncSchema,
} from '../validators/projects.validator.ts'

export type ProjectView = z.infer<typeof projectSchema>

export type ProjectSourceView = z.infer<typeof projectSourceSchema>

export type ProjectSync = z.infer<typeof projectSyncSchema>

export type ProjectSyncInput = z.infer<typeof projectSyncInputSchema>
