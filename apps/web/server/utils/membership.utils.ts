export function activeMembershipWhere(userId: string) {
  return { userId, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }
}
