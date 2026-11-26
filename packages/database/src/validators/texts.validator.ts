import * as z from 'zod'
import { TEXT_STATES } from '../constants/texts.constants.ts'

export const textStateSchema = z.enum(TEXT_STATES)
