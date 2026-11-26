import { defineRelationsPart } from 'drizzle-orm'
import * as schema from '../index.ts'

export const usersRelationsPart = defineRelationsPart(schema, (r) => ({
  user: {
    sessions: r.many.session({ from: r.user.id, to: r.session.userId }),
    authAccounts: r.many.authAccounts({ from: r.user.id, to: r.authAccounts.userId }),
    workspaceMemberships: r.many.workspaceMemberships({
      from: r.user.id,
      to: r.workspaceMemberships.userId,
    }),
    apiKeys: r.many.apiKeys({ from: r.user.id, to: r.apiKeys.referenceId }),
    drafts: r.many.drafts({ from: r.user.id, to: r.drafts.authorId }),
    approvals: r.many.approvals({ from: r.user.id, to: r.approvals.reviewerId }),
  },
  session: {
    user: r.one.user({ from: r.session.userId, to: r.user.id, optional: false }),
  },
  apiKeys: {
    owner: r.one.user({ from: r.apiKeys.referenceId, to: r.user.id, optional: false }),
  },
  authAccounts: {
    user: r.one.user({ from: r.authAccounts.userId, to: r.user.id, optional: false }),
  },
}))
