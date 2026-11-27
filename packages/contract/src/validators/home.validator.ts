import { draftSelectSchema, draftStatusSchema } from '@glot/database/validators/drafts'
import { projectSelectSchema } from '@glot/database/validators/projects'
import { textStateSchema } from '@glot/database/validators/texts'
import { checkFailureSchema } from '@glot/checks/validators'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'
import { workspaceRefInputSchema } from './people.validator.ts'
import { releaseSchema } from './releases.validator.ts'
import { keyRefSchema, textSchema } from './texts.validator.ts'

export const homeInputSchema = workspaceRefInputSchema

const projectRefSchema = z.object({
  projectId: projectSelectSchema.shape.id,
  projectName: projectSelectSchema.shape.name,
})

export const stateCountsSchema = z
  .record(textStateSchema, z.number().int())
  .describe('Texts per state: REVIEWED, TO_CHECK, NEEDS_FIX and MISSING.')

export const fixItemSchema = projectRefSchema.extend({
  textId: draftSelectSchema.shape.textId,
  key: keyRefSchema,
  source: textSchema.shape.source,
  language: languageCodeSchema,
  value: z.string().nullable().describe('The text readers see now.'),
  reason: checkFailureSchema.describe('The first check this text fails.'),
  shownIn: textSchema.shape.shownIn,
})

export const fixesSchema = z.object({
  total: z.number().int().describe('Texts that read wrong in the languages you change.'),
  items: z.array(fixItemSchema).describe('The ones the most apps show, most seen first.'),
})

export const reviewCountSchema = projectRefSchema.extend({
  language: languageCodeSchema,
  total: z.number().int().describe('Texts waiting for you in this language.'),
  sentForReview: z.number().int().describe('Of them, drafts people sent for review.'),
})

export const draftHeadSchema = projectRefSchema.extend({
  draftId: draftSelectSchema.shape.id,
  textId: draftSelectSchema.shape.textId,
  key: keyRefSchema,
  language: languageCodeSchema,
  status: draftStatusSchema,
  updatedAt: draftSelectSchema.shape.updatedAt,
})

export const draftsBlockSchema = z.object({
  inProgress: z.number().int().describe('Your drafts not sent for review yet.'),
  sent: z.number().int().describe('Your drafts waiting for a reviewer.'),
  latest: z.array(draftHeadSchema).describe('Your latest drafts, most recent first.'),
})

export const conflictCountSchema = projectRefSchema.extend({
  total: z.number().int().describe('Approved changes held back, for you to keep or leave out.'),
})

export const needsYouSchema = z.object({
  total: z
    .number()
    .int()
    .describe('Fixes, texts to review, drafts to send and conflicts waiting for you.'),
  fixes: fixesSchema,
  reviews: z.array(reviewCountSchema).describe('One entry per project and language you approve.'),
  drafts: draftsBlockSchema,
  conflicts: z.array(conflictCountSchema),
})

export const progressLanguageSchema = z.object({
  language: languageCodeSchema,
  counts: stateCountsSchema,
})

export const progressSchema = projectRefSchema.extend({
  counts: stateCountsSchema.describe('Every text in every target language of the project.'),
  languages: z.array(progressLanguageSchema),
})

export const shippedReleaseSchema = projectRefSchema.extend(releaseSchema.shape)

export const weekSchema = z.object({
  reviewed: z.number().int().describe('Texts approved in the last 7 days, own changes excluded.'),
  written: z.number().int().describe('Texts written and sent in the last 7 days.'),
  shipped: z.number().int().describe('Releases merged in the last 7 days.'),
})

export const homeOverviewSchema = z.object({
  needsYou: needsYouSchema,
  progress: z.array(progressSchema),
  shipped: z.array(shippedReleaseSchema).describe('The latest merged releases, newest first.'),
  week: weekSchema,
  languages: z.object({
    write: z.array(languageCodeSchema).describe('The languages you change, in any project.'),
    approve: z.array(languageCodeSchema).describe('The languages you approve, in any project.'),
  }),
  nextReleaseAt: z.date().describe('When the clock releases next.'),
})
