import { projectAppSelectSchema, projectSelectSchema } from '@glot/database/validators/projects'
import * as z from 'zod'

export const projectSchema = projectSelectSchema
  .pick({ id: true, name: true, sourceLanguage: true, languages: true })
  .extend({ apps: z.array(projectAppSelectSchema.pick({ id: true, name: true, widget: true })) })
