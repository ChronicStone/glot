import { WORKSPACE_ROLES } from '@glot/database/constants/workspaces'
import { APIError } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { setSessionCookie } from 'better-auth/cookies'
import {
  SETUP_ERRORS,
  SETUP_IDENTIFIER_PREFIX,
  SETUP_LINK_EXPIRES_IN_SECONDS,
  SETUP_PAGE_PATH,
  SETUP_PROVISIONING_SOURCE,
  SETUP_RATE_LIMIT,
  SETUP_TOKEN_PARAMETER,
  SETUP_VERIFICATION_VALUE,
} from '../constants/setup.constants.ts'
import type { SetupPluginOptions } from '../types/setup.types.ts'
import { createSetupToken, setupIdentifier, slugifyWorkspaceName } from '../utils/setup.utils.ts'
import { setupCompleteSchema } from '../validators/setup.validator.ts'
import type { BetterAuthPlugin, DBAdapter } from 'better-auth'

const MILLISECONDS_PER_SECOND = 1000

async function isSetupOpen(adapter: DBAdapter) {
  return (await adapter.count({ model: 'user' })) === 0
}

export function setupPlugin(options: SetupPluginOptions) {
  return {
    id: 'setup',
    endpoints: {
      setupStatus: createAuthEndpoint('/setup/status', { method: 'GET' }, async (ctx) => ({
        open: await isSetupOpen(ctx.context.adapter),
      })),
      issueSetupLink: createAuthEndpoint.serverOnly({ method: 'POST' }, async (ctx) => {
        if (!(await isSetupOpen(ctx.context.adapter))) {
          return null
        }

        const token = createSetupToken()

        await ctx.context.adapter.deleteMany({
          model: 'verification',
          where: [{ field: 'identifier', operator: 'starts_with', value: SETUP_IDENTIFIER_PREFIX }],
        })

        await ctx.context.internalAdapter.createVerificationValue({
          identifier: setupIdentifier(token),
          value: SETUP_VERIFICATION_VALUE,
          expiresAt: new Date(Date.now() + SETUP_LINK_EXPIRES_IN_SECONDS * MILLISECONDS_PER_SECOND),
        })

        const url = new URL(SETUP_PAGE_PATH, options.appUrl)

        url.searchParams.set(SETUP_TOKEN_PARAMETER, token)

        return { url: url.toString() }
      }),
      setupComplete: createAuthEndpoint(
        '/setup/complete',
        { method: 'POST', body: setupCompleteSchema },
        (ctx) =>
          ctx.context.adapter.transaction(async () => {
            const { token, name, email, workspaceName } = ctx.body

            const consumed = await ctx.context.internalAdapter.consumeVerificationValue(
              setupIdentifier(token),
            )

            if (!consumed || !(await isSetupOpen(ctx.context.adapter))) {
              throw new APIError('FORBIDDEN', SETUP_ERRORS.INVALID_LINK)
            }

            const user = await ctx.context.internalAdapter.createUser(
              { name, email, emailVerified: true },
              SETUP_PROVISIONING_SOURCE,
            )

            const workspace = await ctx.context.adapter.create({
              model: 'organization',
              data: { name: workspaceName, slug: slugifyWorkspaceName(workspaceName) },
            })

            await ctx.context.adapter.create({
              model: 'member',
              data: {
                organizationId: workspace.id,
                userId: user.id,
                role: WORKSPACE_ROLES.OWNER,
              },
            })

            const session = await ctx.context.internalAdapter.createSession(user.id, false, {
              activeOrganizationId: workspace.id,
            })

            await setSessionCookie(ctx, { session, user })

            return ctx.json({ userId: user.id, workspaceId: workspace.id })
          }),
      ),
    },
    rateLimit: [
      {
        pathMatcher: (path) => path.startsWith('/setup/'),
        window: SETUP_RATE_LIMIT.WINDOW_SECONDS,
        max: SETUP_RATE_LIMIT.MAX_REQUESTS,
      },
    ],
  } satisfies BetterAuthPlugin
}
