"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { isMembershipActive, isUserPremiumActive, getLatestMembership } from "@/lib/premium";
import { uploadChatMedia } from "@/lib/chat-media";
import { db } from "@/db";
import { directMessages } from "@/db/schema";

export async function sendDirectMessage(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const membership = await getLatestMembership(user.id);
  if (!isMembershipActive(membership)) return;

  const recipientId = String(formData.get("recipientId") ?? "");
  if (!recipientId || recipientId === user.id) return;
  if (!(await isUserPremiumActive(recipientId))) return;

  const message = String(formData.get("message") ?? "").trim();
  if (message.length > 2000) return;

  const photo = formData.get("photo") as File | null;
  let mediaUrl: string | null = null;
  if (photo && photo.size > 0) {
    try {
      mediaUrl = await uploadChatMedia(photo);
    } catch {
      mediaUrl = null;
    }
  }

  if (!message && !mediaUrl) return;

  await db.insert(directMessages).values({
    senderId: user.id,
    recipientId,
    message: message || null,
    mediaUrl,
  });
  revalidatePath(`/architect/community/dm/${recipientId}`);
}
