import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

export const approveInputSchema = z.object({
  projectId: z.uuid(),
  textId: z.string(),
  language: languageCodeSchema,
})
