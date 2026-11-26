import { checkFailureSchema } from '@glot/checks/validators'
import { draftInsertSchema, draftSelectSchema } from '@glot/database/validators/drafts'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

export const draftSchema = draftSelectSchema
  .pick({
    id: true,
    textId: true,
    language: true,
    value: true,
    authorId: true,
    status: true,
    updatedAt: true,
  })
  .extend({
    failures: z
      .array(checkFailureSchema)
      .describe('The checks this draft fails. A draft that fails a check cannot be sent.'),
  })

export const draftSaveInputSchema = draftInsertSchema
  .pick({ projectId: true, textId: true, value: true })
  .extend({ language: languageCodeSchema, value: draftInsertSchema.shape.value.min(1) })

export const draftRefInputSchema = draftSelectSchema
  .pick({ projectId: true })
  .extend({ draftId: draftSelectSchema.shape.id })
