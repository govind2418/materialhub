"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { moodBoardItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function removeFromMoodBoard(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const itemId = String(formData.get("itemId"));

  const item = await db.query.moodBoardItems.findFirst({
    where: (i, { eq }) => eq(i.id, itemId),
  });
  if (!item) return;

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.id, item.moodBoardId),
  });
  if (!board || board.architectUserId !== user.id) return;

  await db.delete(moodBoardItems).where(eq(moodBoardItems.id, itemId));

  revalidatePath("/architect");
}
