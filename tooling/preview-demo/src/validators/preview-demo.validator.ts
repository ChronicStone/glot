import * as z from 'zod'

export const renderRequestSchema = z.object({
  template: z.string(),
  brand: z.string(),
  language: z.string(),
  texts: z.array(z.object({ id: z.string(), path: z.array(z.string()), value: z.string() })),
})

export const sendTestRequestSchema = renderRequestSchema.extend({ to: z.email() })
