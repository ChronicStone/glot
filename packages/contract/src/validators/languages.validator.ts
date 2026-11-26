import * as z from 'zod'

export const languageCodeSchema = z
  .string()
  .regex(/^[a-z]{2,3}(-[A-Z]{2})?$/u)
  .describe('A BCP 47 language code, such as fr, en or en-GB.')
