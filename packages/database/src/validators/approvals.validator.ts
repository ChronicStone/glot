import { createSelectSchema } from 'drizzle-orm/zod'
import { approvals } from '../schemas/approvals/approvals.schema.ts'

export const approvalSelectSchema = createSelectSchema(approvals)
