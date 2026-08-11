"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { getOrCreateActiveProject, getOrCreateProjectBoard } from "@/lib/projects";
import { db } from "@/db";
import { enquiries, enquiryItems, moodBoardItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function addToMoodBoard(productId: string) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return { error: "not-authorized" };

  const project = await getOrCreateActiveProject(user.id);
  const board = await getOrCreateProjectBoard(project.id, user.id);

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
      type: "sample_request",
    })
    .returning();

  await db.insert(enquiryItems).values({ enquiryId: enquiry.id, productId });

  revalidatePath("/architect");
}
