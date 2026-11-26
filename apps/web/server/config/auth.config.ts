import { createGlotAuth, createSmtpMagicLinkSender } from '@glot/auth'
import { env } from '../env.ts'
import { database } from './database.config.ts'

const mail = env.SMTP_URL && env.MAIL_FROM ? { url: env.SMTP_URL, from: env.MAIL_FROM } : undefined

export const auth = createGlotAuth({
  baseURL: env.APP_URL,
  database: database.drizzle,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {}),
  ...(mail ? { sendMagicLinkEmail: createSmtpMagicLinkSender(mail) } : {}),
  ...(import.meta.dev && !mail
    ? {
        sendMagicLinkEmail: ({ to, targetUrl }) => {
          console.warn(`Sign-in link for ${to}: ${targetUrl}`)

          return Promise.resolve()
        },
      }
    : {}),
})
