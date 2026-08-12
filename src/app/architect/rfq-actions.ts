"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries, enquiryItems } from "@/db/schema";

async function buildAllocationSuggestion(
  productIds: string[],
  productsById: Map<string, { name: string }>
): Promise<string | null> {
  const links = productIds.length
    ? await db.query.productDistributors.findMany({
        where: (d, { inArray }) => inArray(d.productId, productIds),
      })
    : [];
  if (links.length === 0) return null;

  const distributorUserIds = [...new Set(links.map((l) => l.distributorUserId))];
  const [inventory, distributorUsers] = await Promise.all([
    db.query.distributorInventory.findMany({
      where: (inv, { inArray }) => inArray(inv.distributorUserId, distributorUserIds),
    }),
    db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, distributorUserIds) }),
  ]);
  const usersById = new Map(distributorUsers.map((u) => [u.id, u]));

  const lines: string[] = [];
  for (const productId of productIds) {
    const linkedDistributorIds = links
      .filter((l) => l.productId === productId)
      .map((l) => l.distributorUserId);
    if (linkedDistributorIds.length < 2) continue;

    const ranked = linkedDistributorIds
      .map((distributorUserId) => ({
        name: usersById.get(distributorUserId)?.name ?? "Unknown distributor",
        quantity: inventory.find(
          (inv) => inv.distributorUserId === distributorUserId && inv.productId === productId
        )?.quantity,
      }))
      .filter((r): r is { name: string; quantity: number } => r.quantity != null)
      .sort((a, b) => b.quantity - a.quantity);

    if (ranked.length < 2) continue;

    const productName = productsById.get(productId)?.name ?? "Product";
    lines.push(
      `- ${productName}: ${ranked.map((r) => `${r.name} (${r.quantity} in stock)`).join(" > ")}`
    );
  }

  if (lines.length === 0) return null;
  return `Suggested fulfillment order by stock:\n${lines.join("\n")}`;
}

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
  const productsById = new Map<string, { name: string }>();
  products.forEach((p) => {
    if (!p) return;
    productsById.set(p.id, { name: p.name });
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
    const allocationSuggestion = await buildAllocationSuggestion(productIds, productsById);
    const message = [
      `RFQ generated from project shortlist (${productIds.length} product${productIds.length > 1 ? "s" : ""}).`,
      allocationSuggestion,
    ]
      .filter(Boolean)
      .join("\n\n");

    const [enquiry] = await db
      .insert(enquiries)
      .values({
        architectUserId: user.id,
        manufacturerId,
        moodBoardId: board.id,
        message,
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
