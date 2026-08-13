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
