"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries, enquiryItems, moodBoardItems, moodBoards, products } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getOrCreateDefaultBoard(architectUserId: string) {
  const existing = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.architectUserId, architectUserId),
  });
  if (existing) return existing;

  const [board] = await db
    .insert(moodBoards)
    .values({ architectUserId, name: "My Mood Board" })
    .returning();
  return board;
}

export async function addToMoodBoard(productId: string) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return { error: "not-authorized" };

  const board = await getOrCreateDefaultBoard(user.id);

  const existingItem = await db.query.moodBoardItems.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.moodBoardId, board.id), eq(i.productId, productId)),
  });

  if (!existingItem) {
    await db.insert(moodBoardItems).values({ moodBoardId: board.id, productId });
  }

  revalidatePath("/architect");
  return { ok: true };
}

export async function sendEnquiry(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const productId = String(formData.get("productId"));
  const message = String(formData.get("message") ?? "");

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return;

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      architectUserId: user.id,
      manufacturerId: product.manufacturerId,
      message,
    })
    .returning();

  await db.insert(enquiryItems).values({ enquiryId: enquiry.id, productId });

  revalidatePath("/architect");
}
