import * as z from 'zod'

export const answersSchema = z.object({
  translations: z.array(
    z.object({ id: z.number().int(), text: z.string(), reason: z.string().optional() }),
  ),
})

export const anthropicResponseSchema = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
  stop_reason: z.string().nullable().optional(),
  usage: z.object({ input_tokens: z.number().int(), output_tokens: z.number().int() }),
})

export const openaiResponseSchema = z.object({
  status: z.string().optional(),
  output: z.array(
    z.object({
      type: z.string(),
      content: z.array(z.object({ type: z.string(), text: z.string().optional() })).optional(),
    }),
  ),
  usage: z.object({ input_tokens: z.number().int(), output_tokens: z.number().int() }),
})

export const providerErrorSchema = z.object({
  error: z.object({ message: z.string() }),
})

export const stopDataSchema = z.object({ reason: z.string() })
