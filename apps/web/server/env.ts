import * as z from 'zod'

export const env = z
  .object({
    DATABASE_URL: z.url(),
    AUTH_SECRET: z.string().min(32),
    APP_URL: z.url().default('http://localhost:3100'),
    GOOGLE_CLIENT_ID: z.string().optional(),
    GOOGLE_CLIENT_SECRET: z.string().optional(),
    SMTP_URL: z
      .string()
      .regex(/^smtps?:\/\//u)
      .or(z.literal(''))
      .optional(),
    MAIL_FROM: z.string().optional(),
    GLOT_GIT_ROOT: z.string().optional(),
    GITHUB_TOKEN: z.string().optional(),
    GLOT_VERSION: z.string().default('0.0.0'),
  })
  .refine(({ SMTP_URL, MAIL_FROM }) => !SMTP_URL || Boolean(MAIL_FROM), {
    message: 'MAIL_FROM is required with SMTP_URL',
    path: ['MAIL_FROM'],
  })
  .parse(process.env)
