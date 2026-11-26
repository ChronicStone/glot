import * as z from 'zod'
import { CHECK_CODES } from '../constants/checks.constants.ts'

export const checkCodeSchema = z.enum(CHECK_CODES)

export const checkFailureSchema = z.object({
  code: checkCodeSchema,
  message: z.string().describe('What is wrong, in words a writer understands.'),
})
