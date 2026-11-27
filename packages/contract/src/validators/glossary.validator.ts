import {
  glossaryConceptSelectSchema,
  glossaryConceptTermSelectSchema,
  glossaryTermStatusSchema,
} from '@glot/database/validators/glossary'
import * as z from 'zod'
import { languageCodeSchema } from './languages.validator.ts'
import { workspaceRefInputSchema } from './people.validator.ts'
import { textRefInputSchema } from './texts.validator.ts'

export const glossaryLanguageTermSchema = glossaryConceptTermSelectSchema
  .pick({ term: true, plural: true, avoid: true })
  .extend({
    term: glossaryConceptTermSelectSchema.shape.term.describe('The word to use in this language.'),
    avoid: glossaryConceptTermSelectSchema.shape.avoid.describe(
      'Words that must not appear in a text of this language.',
    ),
  })

export const glossaryTermSchema = glossaryConceptSelectSchema
  .pick({ id: true, name: true, definition: true, status: true, neverTranslate: true, notes: true })
  .extend({
    neverTranslate: glossaryConceptSelectSchema.shape.neverTranslate.describe(
      'True when every term of the concept stays as written in every language.',
    ),
    terms: z
      .record(languageCodeSchema, glossaryLanguageTermSchema)
      .describe('The term, its plural and the words to avoid, by language.'),
  })

export const glossaryListInputSchema = textRefInputSchema.pick({ projectId: true }).extend({
  language: languageCodeSchema
    .optional()
    .describe('Only the terms with a word in this language, and those never translated.'),
})

export const glossaryConceptsInputSchema = workspaceRefInputSchema.extend({
  status: glossaryTermStatusSchema.optional(),
})

const wordSchema = glossaryConceptTermSelectSchema.shape.term.trim().min(1)

const languageTermInputSchema = glossaryLanguageTermSchema.extend({
  term: wordSchema,
  plural: wordSchema.nullable(),
  avoid: z.array(wordSchema),
})

const conceptDetailsSchema = glossaryTermSchema
  .pick({ name: true, definition: true, neverTranslate: true, notes: true })
  .extend({
    name: glossaryConceptSelectSchema.shape.name.trim().min(1),
    terms: z.record(languageCodeSchema, languageTermInputSchema),
  })

export const glossaryConceptCreateInputSchema = conceptDetailsSchema.extend({
  workspaceId: glossaryConceptSelectSchema.shape.workspaceId,
  definition: conceptDetailsSchema.shape.definition.default(''),
  neverTranslate: conceptDetailsSchema.shape.neverTranslate.default(false),
  notes: conceptDetailsSchema.shape.notes.default(''),
})

export const glossaryConceptRefInputSchema = z.object({
  conceptId: glossaryConceptSelectSchema.shape.id,
})

export const glossaryConceptUpdateInputSchema = conceptDetailsSchema.extend(
  glossaryConceptRefInputSchema.shape,
)

export const glossaryStatusInputSchema = glossaryConceptRefInputSchema.extend({
  status: glossaryTermStatusSchema,
})

export const glossaryRightsSchema = z.object({
  suggest: z.boolean().describe('True when you can suggest concepts and change their terms.'),
  anyLanguage: z.boolean().describe('True when you can change the terms of every language.'),
  languages: z
    .array(languageCodeSchema)
    .describe('The languages whose terms you can change, when not every language.'),
})
