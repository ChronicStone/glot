import { checkFailureSchema } from '@glot/checks/validators'
import { draftSelectSchema } from '@glot/database/validators/drafts'
import { textStateSchema } from '@glot/database/validators/texts'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'

export const keyRefSchema = z
  .object({
    source: z.string().describe('The source holding the text, such as shared-base.'),
    path: z
      .array(z.string())
      .min(1)
      .describe("JSON path segments: ['a.b'] and ['a', 'b'] are two keys."),
  })
  .describe('Where a text lives. Never shown to writers.')

export const translationSchema = z.object({
  language: languageCodeSchema,
  value: z.string().nullable(),
  state: textStateSchema,
  failures: z
    .array(checkFailureSchema)
    .describe('The checks this text fails, each with a code and a reason. Empty when none fails.'),
  reviewedBy: z.string().nullable(),
  aiWritten: z.boolean(),
})

export const textSchema = z.object({
  id: z.string(),
  key: keyRefSchema,
  source: z.object({ language: languageCodeSchema, value: z.string() }),
  where: z.string().describe('Where readers see it, in words: the source that holds the text.'),
  shownIn: z.array(z.string()).describe('The apps that show this text.'),
  translations: z.array(translationSchema),
})

export const textRefInputSchema = draftSelectSchema.pick({ projectId: true, textId: true })

export const textSearchInputSchema = textRefInputSchema.pick({ projectId: true }).extend({
  q: z.string().optional().describe('Words to find, in any language.'),
  state: textStateSchema.optional(),
  language: languageCodeSchema.optional().describe('The language the state filter applies to.'),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().optional(),
})

export const textPageSchema = z.object({
  items: z.array(textSchema),
  total: z.number().int(),
  nextCursor: z.string().nullable(),
})
