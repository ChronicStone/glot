import type * as z from 'zod'
import type {
  monthlyReportInputSchema,
  monthlyReportSchema,
} from '../validators/reports.validator.ts'

export type MonthlyReportInput = z.infer<typeof monthlyReportInputSchema>

export type MonthlyReport = z.infer<typeof monthlyReportSchema>
