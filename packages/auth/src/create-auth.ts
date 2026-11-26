import { apiKey } from '@better-auth/api-key'
import * as schema from '@glot/database/schemas'
import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, organization } from 'better-auth/plugins'
import {
  AUTH_COOKIE_PREFIX,
  MAGIC_LINK_EXPIRES_IN_SECONDS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from './constants/auth.constants.ts'
import {
  userAdditionalFields,
  workspaceCreatorRole,
  workspaceSchemaMapping,
} from './config/auth.config.ts'
import type { CreateAuthOptions } from './types/auth.types.ts'

export function createGlotAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: 'Glot',
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(options.database, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.authAccounts,
        verification: schema.verification,
        organization: schema.workspaces,
        member: schema.workspaceMemberships,
        invitation: schema.workspaceInvitations,
        apikey: schema.apiKeys,
      },
    }),
    socialProviders: options.google ? { google: options.google } : {},
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      cookieCache: { enabled: true, maxAge: 300 },
    },
    advanced: { cookiePrefix: AUTH_COOKIE_PREFIX },
    user: { additionalFields: userAdditionalFields },
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        creatorRole: workspaceCreatorRole,
        schema: workspaceSchemaMapping,
      }),
      magicLink({
        disableSignUp: true,
        expiresIn: MAGIC_LINK_EXPIRES_IN_SECONDS,
        storeToken: 'hashed',
        sendMagicLink: async ({ email, url }) => {
          if (!options.sendMagicLinkEmail) {
            throw new Error('Sign-in email delivery is not configured.')
          }

          await options.sendMagicLinkEmail({ to: email, targetUrl: url })
        },
      }),
      apiKey({ enableSessionForAPIKeys: false }),
    ],
  })
}
