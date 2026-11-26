import { draftInsertSchema, draftSelectSchema } from '@glot/database/validators/drafts'
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

export const draftSaveInputSchema = draftInsertSchema
  .pick({ projectId: true, textId: true, value: true })
  .extend({ language: languageCodeSchema })
