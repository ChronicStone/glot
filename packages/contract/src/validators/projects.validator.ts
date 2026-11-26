import {
  projectAppSelectSchema,
  projectSelectSchema,
  projectSourceSelectSchema,
} from '@glot/database/validators/projects'
import * as z from 'zod'
import { textRefInputSchema } from './texts.validator.ts'

export const projectSourceSchema = projectSourceSelectSchema.pick({
  name: true,
  kind: true,
  pathPattern: true,
  sourceLanguage: true,
  languages: true,
})

export const projectSchema = projectSelectSchema
  .pick({ id: true, workspaceId: true, name: true, sourceLanguage: true, languages: true })
  .extend({
    apps: z.array(projectAppSelectSchema.pick({ id: true, name: true, widget: true })),
    sources: z.array(projectSourceSchema),
  })

export const projectSyncInputSchema = textRefInputSchema.pick({ projectId: true })

export const projectSyncSchema = z.object({
  commit: z.string().describe('The commit of the default branch the texts were read from.'),
  texts: z.number().int().describe('How many texts the project holds at that commit.'),
})
