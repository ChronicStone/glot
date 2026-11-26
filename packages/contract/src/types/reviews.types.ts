import type * as z from 'zod'
import type {
  approveInputSchema,
  approveSameInputSchema,
  approveSameSchema,
  commentInputSchema,
  commentSchema,
  editAndApproveInputSchema,
  queueInputSchema,
  queueSchema,
  requestChangeInputSchema,
  reviewItemSchema,
  reviewReasonSchema,
  reviewTargetInputSchema,
  rightsSchema,
} from '../validators/reviews.validator.ts'

export type ReviewReason = z.infer<typeof reviewReasonSchema>

export type ReviewTargetInput = z.infer<typeof reviewTargetInputSchema>

export type ApproveInput = z.infer<typeof approveInputSchema>

export type EditAndApproveInput = z.infer<typeof editAndApproveInputSchema>

export type RequestChangeInput = z.infer<typeof requestChangeInputSchema>

export type CommentInput = z.infer<typeof commentInputSchema>

export type CommentView = z.infer<typeof commentSchema>

export type QueueInput = z.infer<typeof queueInputSchema>

export type ReviewItem = z.infer<typeof reviewItemSchema>

export type ReviewQueue = z.infer<typeof queueSchema>

export type ApproveSameInput = z.infer<typeof approveSameInputSchema>

export type ApproveSame = z.infer<typeof approveSameSchema>

export type Rights = z.infer<typeof rightsSchema>
