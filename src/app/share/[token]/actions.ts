"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { moodBoardItems } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function setApprovalStatus(formData: FormData): Promise<void> {
  const token = String(formData.get("token"));
  const itemId = String(formData.get("itemId"));
  const status = String(formData.get("status")) as
    | "pending"
    | "approved"
    | "rejected"
    | "alternative_requested";

  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.shareToken, token),
  });
  if (!project) return;

  const item = await db.query.moodBoardItems.findFirst({
    where: (i, { eq }) => eq(i.id, itemId),
  });
  if (!item) return;

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.id, item.moodBoardId),
  });
  if (!board || board.projectId !== project.id) return;

  await db
    .update(moodBoardItems)
    .set({ approvalStatus: status })
    .where(eq(moodBoardItems.id, itemId));

  revalidatePath(`/share/${token}`);
}
