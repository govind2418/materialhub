import { db } from "@/db";

export const PREMIUM_MONTHLY_AMOUNT = 50000;

export function isMembershipActive(membership: { status: string; expiresAt: Date | string | null } | null | undefined): boolean {
  if (!membership) return false;
  if (membership.status !== "active") return false;
  if (!membership.expiresAt) return false;
  return new Date(membership.expiresAt) > new Date();
}

export async function getLatestMembership(userId: string) {
  return db.query.premiumMemberships.findFirst({
    where: (m, { eq }) => eq(m.userId, userId),
    orderBy: (m, { desc }) => desc(m.requestedAt),
  });
}

export async function isUserPremiumActive(userId: string): Promise<boolean> {
  return isMembershipActive(await getLatestMembership(userId));
}

export async function getActivePremiumMembers(excludeUserId?: string) {
  const active = await db.query.premiumMemberships.findMany({
    where: (m, { eq, and, gt }) => and(eq(m.status, "active"), gt(m.expiresAt, new Date())),
  });
  const userIds = [...new Set(active.map((m) => m.userId))].filter((id) => id !== excludeUserId);
  if (userIds.length === 0) return [];
  return db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, userIds) });
}
