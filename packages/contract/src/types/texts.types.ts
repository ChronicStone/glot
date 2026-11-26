import type * as z from 'zod'
import type {
  keyRefSchema,
  textPageSchema,
  textSchema,
  textSearchInputSchema,
  translationSchema,
} from '../validators/texts.validator.ts'

export type KeyRef = z.infer<typeof keyRefSchema>

export type Translation = z.infer<typeof translationSchema>

export type Text = z.infer<typeof textSchema>

export type TextPage = z.infer<typeof textPageSchema>

export type TextSearchInput = z.infer<typeof textSearchInputSchema>
