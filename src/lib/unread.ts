import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { communityReadState, directMessages } from "@/db/schema";

export async function getUnreadGroupCount(userId: string): Promise<number> {
  const readState = await db.query.communityReadState.findFirst({
    where: (r, { eq }) => eq(r.userId, userId),
  });
  const since = readState?.lastReadAt ?? new Date(0);

  const unread = await db.query.communityMessages.findMany({
    where: (m, { and, gt, ne }) => and(gt(m.createdAt, since), ne(m.userId, userId)),
  });
  return unread.length;
}

export async function markGroupRead(userId: string): Promise<void> {
  await db
    .insert(communityReadState)
    .values({ userId, lastReadAt: new Date() })
    .onConflictDoUpdate({ target: communityReadState.userId, set: { lastReadAt: new Date() } });
}

export async function getUnreadDmInfo(userId: string): Promise<{ total: number; unreadPartnerIds: Set<string> }> {
  const unread = await db.query.directMessages.findMany({
    where: (d, { and, eq, isNull }) => and(eq(d.recipientId, userId), isNull(d.readAt)),
  });
  return { total: unread.length, unreadPartnerIds: new Set(unread.map((d) => d.senderId)) };
}

export async function markDmThreadRead(userId: string, partnerId: string): Promise<void> {
  await db
    .update(directMessages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(directMessages.recipientId, userId),
        eq(directMessages.senderId, partnerId),
        isNull(directMessages.readAt)
      )
    );
}
