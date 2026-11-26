import * as z from 'zod'

export const avoidWordsSchema = z.record(z.string(), z.array(z.string()))
