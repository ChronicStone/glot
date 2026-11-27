import { userSelectSchema } from '@glot/database/validators/users'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'
import { workspaceRefInputSchema } from './people.validator.ts'

export const monthSchema = z
  .string()
  .regex(/^\d{4}-(?:0[1-9]|1[0-2])$/u, 'Use a month such as 2026-11')
  .describe('A calendar month in UTC, such as 2026-11.')

export const monthlyReportInputSchema = workspaceRefInputSchema.extend({ month: monthSchema })

export const volumeSchema = z.object({
  texts: z.number().int(),
  words: z.number().int().describe('Words of the target texts, without placeholders or tags.'),
})

export const reportLanguageSchema = z.object({
  language: languageCodeSchema,
  written: volumeSchema,
  reviewed: volumeSchema,
})

export const reportPersonSchema = z.object({
  user: userSelectSchema.pick({ id: true, name: true, email: true }),
  written: volumeSchema.describe('Drafts they wrote that were sent for review.'),
  reviewed: volumeSchema.describe('Texts they approved, their own changes excluded.'),
  languages: z.array(reportLanguageSchema),
})

export const monthlyReportSchema = z.object({
  month: monthSchema,
  people: z.array(reportPersonSchema).describe('Most words first.'),
  totals: z.object({ written: volumeSchema, reviewed: volumeSchema }),
})
