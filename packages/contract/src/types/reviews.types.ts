import type * as z from 'zod'
import type { approveInputSchema } from '../validators/reviews.validator.ts'

export type ApproveInput = z.infer<typeof approveInputSchema>
