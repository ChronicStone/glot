import * as z from 'zod'

export const healthSchema = z.object({ ok: z.literal(true), version: z.string() })
