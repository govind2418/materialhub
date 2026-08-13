"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { getLatestMembership, isMembershipActive } from "@/lib/premium";
import { db } from "@/db";
import { communityMessages } from "@/db/schema";

export async function postCommunityMessage(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const membership = await getLatestMembership(user.id);
  if (!isMembershipActive(membership)) return;

  const message = String(formData.get("message") ?? "").trim();
  if (!message || message.length > 2000) return;

  await db.insert(communityMessages).values({ userId: user.id, message });
  revalidatePath("/architect/community");
}
