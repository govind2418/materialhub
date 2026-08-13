"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { PREMIUM_MONTHLY_AMOUNT } from "@/lib/premium";
import { db } from "@/db";
import { premiumMemberships } from "@/db/schema";

export async function requestPremiumMembership(): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const existing = await db.query.premiumMemberships.findFirst({
    where: (m, { and, eq, inArray }) => and(eq(m.userId, user.id), inArray(m.status, ["pending", "active"])),
  });
  if (existing) return;

  await db.insert(premiumMemberships).values({
    userId: user.id,
    amount: PREMIUM_MONTHLY_AMOUNT,
  });

  revalidatePath("/architect/premium");
}
