import { templateKindSchema } from '@glot/contract/validators'
import * as z from 'zod'

export const adapterCatalogSchema = z.object({
  brands: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        sources: z.array(z.string().min(1)).min(1),
      }),
    )
    .min(1),
  templates: z.array(
    z.object({
      id: z.string().min(1),
      name: z.string().min(1),
      group: z.string().min(1),
      kind: templateKindSchema,
      texts: z.array(z.array(z.string()).min(1)),
    }),
  ),
  sendTest: z.boolean().default(false),
})

export const adapterRenderSchema = z.object({
  kind: templateKindSchema,
  subject: z.string().nullable().default(null),
  from: z.string().nullable().default(null),
  html: z.string().nullable().default(null),
  text: z.string().nullable().default(null),
})

export const adapterSendTestSchema = z.object({ sent: z.literal(true) })
