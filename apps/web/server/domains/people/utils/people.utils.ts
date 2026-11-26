import type { User } from '@glot/database/types/users'
import type { WorkspaceMembership } from '@glot/database/types/workspaces'

export function toPerson(membership: WorkspaceMembership & { user: User }) {
  return {
    id: membership.id,
    role: membership.role,
    languages: membership.languages,
    expiresAt: membership.expiresAt,
    user: {
      id: membership.user.id,
      name: membership.user.name,
      email: membership.user.email,
      image: membership.user.image,
    },
    signedIn: membership.user.emailVerified,
  }
}
