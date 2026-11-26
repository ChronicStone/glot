import type * as z from 'zod'
import type { projectSchema } from '../validators/projects.validator.ts'

export type ProjectView = z.infer<typeof projectSchema>
