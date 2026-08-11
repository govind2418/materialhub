"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries, enquiryItems } from "@/db/schema";

export async function generateRfq(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const moodBoardId = String(formData.get("moodBoardId"));

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.id, moodBoardId),
  });
  if (!board || board.architectUserId !== user.id) return;

  const items = await db.query.moodBoardItems.findMany({
    where: (i, { eq }) => eq(i.moodBoardId, board.id),
  });
  if (items.length === 0) return;

  const products = await Promise.all(
    items.map((i) =>
      db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) })
    )
  );

  const productIdsByManufacturer = new Map<string, string[]>();
  products.forEach((p) => {
    if (!p) return;
    const list = productIdsByManufacturer.get(p.manufacturerId) ?? [];
    list.push(p.id);
    productIdsByManufacturer.set(p.manufacturerId, list);
  });

  if (productIdsByManufacturer.size === 0) return;

  // Multiple manufacturers in one project's shortlist means this RFQ is
  // split across suppliers by construction — one enquiry row per
  // manufacturer, all sharing the same rfqId so the architect can see it
  // as a single logical request.
  const rfqId = randomUUID();

  for (const [manufacturerId, productIds] of productIdsByManufacturer) {
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        architectUserId: user.id,
        manufacturerId,
        moodBoardId: board.id,
        message: `RFQ generated from project shortlist (${productIds.length} product${productIds.length > 1 ? "s" : ""}).`,
        type: "rfq",
        rfqId,
      })
      .returning();

    await db
      .insert(enquiryItems)
      .values(productIds.map((productId) => ({ enquiryId: enquiry.id, productId })));
  }

  revalidatePath("/architect");
}
