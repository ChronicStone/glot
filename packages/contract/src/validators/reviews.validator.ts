import { commentSelectSchema } from '@glot/database/validators/comments'
import { draftSelectSchema } from '@glot/database/validators/drafts'
import * as z from 'zod'
import { REVIEW_REASONS } from '../constants/contract.constants.ts'
import { draftSchema } from './drafts.validator.ts'
import { languageCodeSchema } from './languages.validator.ts'
import { textRefInputSchema, textSchema, textSearchInputSchema } from './texts.validator.ts'

export const reviewReasonSchema = z.enum(REVIEW_REASONS)

export const reviewTargetInputSchema = textRefInputSchema.extend({ language: languageCodeSchema })

export const approveInputSchema = reviewTargetInputSchema.extend({
  draftId: draftSelectSchema.shape.id
    .optional()
    .describe('A draft sent for review to approve. Without it, the text as it is now.'),
})

export const editAndApproveInputSchema = reviewTargetInputSchema.extend({
  value: draftSelectSchema.shape.value.min(1).describe('The text as the reviewer corrects it.'),
})

export const commentBodySchema = commentSelectSchema.shape.body.trim().min(1)

export const requestChangeInputSchema = approveInputSchema.extend({ body: commentBodySchema })

export const commentInputSchema = reviewTargetInputSchema.extend({ body: commentBodySchema })

export const commentSchema = commentSelectSchema
  .pick({ id: true, language: true, kind: true, body: true, authorId: true, createdAt: true })
  .extend({ authorName: z.string() })

export const queueInputSchema = textSearchInputSchema
  .pick({ projectId: true, limit: true, cursor: true })
  .extend({ language: languageCodeSchema })

export const reviewItemSchema = z.object({
  reason: reviewReasonSchema.describe('Why this item is in the queue.'),
  language: languageCodeSchema,
  text: textSchema,
  draft: draftSchema.nullable().describe('The draft to approve, when one was sent for review.'),
})

export const queueSchema = z.object({
  items: z.array(reviewItemSchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
  sameElsewhere: z
    .number()
    .int()
    .describe('Texts whose source and target are already approved together on another text.'),
})

export const approveSameInputSchema = queueInputSchema.pick({ projectId: true, language: true })

export const approveSameSchema = z.object({ approved: z.number().int() })

export const rightsInputSchema = textRefInputSchema.pick({ projectId: true })

export const rightsSchema = z.object({
  write: z.array(languageCodeSchema).describe('The languages you can write.'),
  approve: z.array(languageCodeSchema).describe('The languages you can approve.'),
})
