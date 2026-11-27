import { createGlotAuth, createSmtpMagicLinkSender } from '@glot/auth'
import type { SendMagicLinkEmail } from '@glot/auth'
import { env } from '../env.ts'
import { database } from './database.config.ts'
import { mailOptions as mail } from './mail.config.ts'

const smtpSender = mail ? createSmtpMagicLinkSender(mail) : undefined

const sendMagicLinkEmail: SendMagicLinkEmail | undefined = import.meta.dev
  ? async (message) => {
      console.warn(`Sign-in link for ${message.to}: ${message.targetUrl}`)
      await smtpSender?.(message)
    }
  : smtpSender

export const auth = createGlotAuth({
  baseURL: env.APP_URL,
  database: database.drizzle,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {}),
  ...(sendMagicLinkEmail ? { sendMagicLinkEmail } : {}),
})
