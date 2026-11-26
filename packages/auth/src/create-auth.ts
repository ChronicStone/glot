import { apiKey } from '@better-auth/api-key'
import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import * as schema from '@glot/database/schemas'
import { betterAuth, generateId } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { magicLink, organization } from 'better-auth/plugins'
import {
  AUTH_COOKIE_PREFIX,
  DATABASE_ID_MODELS,
  MAGIC_LINK_EXPIRES_IN_SECONDS,
  REPLACED_WORKSPACE_PATHS,
  SESSION_EXPIRES_IN_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from './constants/auth.constants.ts'
import {
  userAdditionalFields,
  workspaceAccessControl,
  workspaceRoles,
  workspaceSchemaMapping,
} from './config/auth.config.ts'
import { setupPlugin } from './plugins/setup.plugin.ts'
import type { CreateAuthOptions } from './types/auth.types.ts'

export function createGlotAuth(options: CreateAuthOptions) {
  return betterAuth({
    appName: 'Glot',
    baseURL: options.baseURL,
    secret: options.secret,
    trustedOrigins: options.trustedOrigins,
    database: drizzleAdapter(options.database, {
      provider: 'pg',
      transaction: true,
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
    disabledPaths: Object.values(REPLACED_WORKSPACE_PATHS),
    socialProviders: options.google
      ? { google: { ...options.google, disableImplicitSignUp: true } }
      : {},
    session: {
      expiresIn: SESSION_EXPIRES_IN_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      cookieCache: { enabled: true, maxAge: 300 },
    },
    advanced: {
      cookiePrefix: AUTH_COOKIE_PREFIX,
      database: {
        generateId: ({ model }) =>
          Object.values<string>(DATABASE_ID_MODELS).includes(model) ? false : generateId(),
      },
    },
    user: { additionalFields: userAdditionalFields },
    plugins: [
      organization({
        allowUserToCreateOrganization: async (user) =>
          Boolean(
            await options.database.query.workspaceMemberships.findFirst({
              where: { userId: user.id, role: WORKSPACE_ROLES.OWNER },
            }),
          ),
        ac: workspaceAccessControl,
        roles: workspaceRoles,
        creatorRole: WORKSPACE_ROLES.OWNER,
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
      setupPlugin({ appUrl: options.baseURL }),
    ],
  })
}
