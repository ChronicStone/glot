import { createGlotAuth } from '@glot/auth'
import { env } from '../env.ts'
import { database } from './database.config.ts'

export const auth = createGlotAuth({
  baseURL: env.APP_URL,
  database: database.drizzle,
  secret: env.AUTH_SECRET,
  trustedOrigins: [env.APP_URL],
  ...(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? { google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET } }
    : {}),
  ...(import.meta.dev
    ? {
        sendMagicLinkEmail: ({ to, targetUrl }) => {
          console.warn(`Sign-in link for ${to}: ${targetUrl}`)

          return Promise.resolve()
        },
      }
    : {}),
})
