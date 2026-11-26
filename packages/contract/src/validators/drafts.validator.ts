import { draftSelectSchema } from '@glot/database/validators/drafts'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

export const draftSchema = draftSelectSchema.pick({
  id: true,
  textId: true,
  language: true,
  value: true,
  authorId: true,
  status: true,
  updatedAt: true,
})

export const draftSaveInputSchema = z.object({
  projectId: z.uuid(),
  textId: z.string(),
  language: languageCodeSchema,
  value: z.string(),
})
