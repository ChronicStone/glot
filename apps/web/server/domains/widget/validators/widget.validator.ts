import * as z from 'zod'

export const widgetClaimsSchema = z.object({
  sessionId: z.string(),
  userId: z.string(),
  projectId: z.uuid(),
  origin: z.url(),
  expiresAt: z.number().int(),
})
