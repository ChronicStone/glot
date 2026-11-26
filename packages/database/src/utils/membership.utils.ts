export function activeMembershipWhere(options: { userId?: string; now?: Date } = {}) {
  const now = options.now ?? new Date()

  return {
    ...(options.userId === undefined ? {} : { userId: options.userId }),
    OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
  }
}
