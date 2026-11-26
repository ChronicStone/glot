import * as z from 'zod'

export const env = z
  .object({
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    APP_URL: z.url().default('http://localhost:3100'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    GLOT_VERSION: z.string().default('0.0.0'),
  })
  .parse(process.env)
