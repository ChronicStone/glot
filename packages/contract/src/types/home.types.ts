import type * as z from 'zod'
import type {
  homeInputSchema,
  homeOverviewSchema,
  stateCountsSchema,
} from '../validators/home.validator.ts'

export type HomeInput = z.infer<typeof homeInputSchema>

export type HomeOverview = z.infer<typeof homeOverviewSchema>

export type StateCounts = z.infer<typeof stateCountsSchema>
