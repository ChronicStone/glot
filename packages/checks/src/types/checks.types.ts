import type { ValueOf } from '@glot/utils/types'
import type * as z from 'zod'
import type { CHECK_CODES } from '../constants/checks.constants.ts'
import type { SYNTAXES } from '../constants/syntax.constants.ts'
import type { checkFailureSchema } from '../validators/checks.validator.ts'

export type CheckCode = ValueOf<typeof CHECK_CODES>

export type CheckFailure = z.infer<typeof checkFailureSchema>

export type Syntax = ValueOf<typeof SYNTAXES>

export interface TextSegment {
  placeholder: boolean
  value: string
}

export interface HtmlTag {
  closing: boolean
  name: string
  selfClosing: boolean
  attributes: { name: string; value: string }[]
}
