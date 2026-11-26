import { keyRefSchema } from '@glot/contract/validators'
import * as z from 'zod'

export const reviewLineSchema = z.object({
  key: keyRefSchema,
  sourceHash: z.string(),
  targetHash: z.string(),
  reviewedBy: z.string(),
  selfApproved: z.boolean().optional(),
})
