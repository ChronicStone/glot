import type * as z from 'zod'
import type { avoidWordsSchema } from '../validators/avoid.validator.ts'

export type AvoidWords = z.infer<typeof avoidWordsSchema>

export interface CheckArguments {
  patterns: string[]
  sourceLanguage: string
  languages: string[]
  avoidFile: string | undefined
  root: string
}

export interface CatalogFailure {
  path: string
  key: string
  language: string
  code: string
  message: string
}
