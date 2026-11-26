import * as z from 'zod'
import { GLOSSARY_TERM_STATUSES } from '../constants/glossary.constants.ts'

export const glossaryTermStatusSchema = z.enum(GLOSSARY_TERM_STATUSES)
