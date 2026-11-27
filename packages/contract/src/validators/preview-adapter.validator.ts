import * as z from 'zod'
import { templateKindSchema } from './templates.validator.ts'

export const previewAdapterCatalogSchema = z.object({
  brands: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        sources: z
          .array(z.string().min(1))
          .min(1)
          .describe('The project sources the brand reads, first to last.'),
      }),
    )
    .min(1),
  templates: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      group: z.string().min(1),
      kind: templateKindSchema,
      texts: z
        .array(z.array(z.string()).min(1))
        .describe('The paths of the texts the template uses, in reading order.'),
    }),
  ),
  sendTest: z.boolean().default(false),
})

export const previewAdapterRenderRequestSchema = z.object({
  template: z.string(),
  brand: z.string(),
  language: z.string(),
  texts: z.array(z.object({ id: z.string(), path: z.array(z.string()), value: z.string() })),
})

export const previewAdapterSendTestRequestSchema = previewAdapterRenderRequestSchema.extend({
  to: z.email(),
})

export const previewAdapterRenderSchema = z.object({
  kind: templateKindSchema,
  subject: z.string().nullable().default(null),
  from: z.string().nullable().default(null),
  html: z.string().nullable().default(null),
  text: z.string().nullable().default(null),
})

export const previewAdapterSendTestSchema = z.object({ sent: z.literal(true) })
