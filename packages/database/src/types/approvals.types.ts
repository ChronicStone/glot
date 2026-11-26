import type { approvals } from '../schemas/approvals/approvals.schema.ts'

export type Approval = typeof approvals.$inferSelect

export type ApprovalInsert = typeof approvals.$inferInsert
