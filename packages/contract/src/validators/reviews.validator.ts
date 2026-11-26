import { languageCodeSchema } from './languages.validator.ts'
import { textRefInputSchema } from './texts.validator.ts'

export const approveInputSchema = textRefInputSchema.extend({ language: languageCodeSchema })
