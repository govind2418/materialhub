"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/current-user";
import { getCurrentProductVersionId } from "@/lib/product-versions";
import { allocateQuantityToDistributors } from "@/lib/procurement";
import { db } from "@/db";
import { cartItems, enquiries, enquiryItems, orderAllocations } from "@/db/schema";

export async function addToCart(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const productId = String(formData.get("productId"));
  const quantityRaw = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  const existing = await db.query.cartItems.findFirst({
    where: (c, { and, eq }) => and(eq(c.userId, user.id), eq(c.productId, productId)),
  });

  if (existing) {
    await db
      .update(cartItems)
      .set({ quantity: existing.quantity + quantity })
      .where(eq(cartItems.id, existing.id));
  } else {
    await db.insert(cartItems).values({ userId: user.id, productId, quantity });
  }

  revalidatePath("/cart");
  revalidatePath("/catalog");
}

export async function updateCartQuantity(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const itemId = String(formData.get("itemId"));
  const quantityRaw = Number.parseInt(String(formData.get("quantity") ?? "1"), 10);
  const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? quantityRaw : 1;

  const item = await db.query.cartItems.findFirst({ where: (c, { eq }) => eq(c.id, itemId) });
  if (!item || item.userId !== user.id) return;

  await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, itemId));
  revalidatePath("/cart");
}

export async function removeFromCart(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const itemId = String(formData.get("itemId"));
  const item = await db.query.cartItems.findFirst({ where: (c, { eq }) => eq(c.id, itemId) });
  if (!item || item.userId !== user.id) return;

  await db.delete(cartItems).where(eq(cartItems.id, itemId));
  revalidatePath("/cart");
}

export async function submitCartOrder(): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const items = await db.query.cartItems.findMany({
    where: (c, { eq }) => eq(c.userId, user.id),
  });
  if (items.length === 0) return;

  const productList = await Promise.all(
    items.map((i) => db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) }))
  );

  const byManufacturer = new Map<string, { productId: string; quantity: number }[]>();
  items.forEach((item, idx) => {
    const product = productList[idx];
    if (!product) return;
    const list = byManufacturer.get(product.manufacturerId) ?? [];
    list.push({ productId: product.id, quantity: item.quantity });
    byManufacturer.set(product.manufacturerId, list);
  });

  const orderId = byManufacturer.size > 1 ? randomUUID() : null;

  for (const [manufacturerId, lines] of byManufacturer) {
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        architectUserId: user.id,
        manufacturerId,
        message: `Order request: ${lines.length} product${lines.length > 1 ? "s" : ""} from cart.`,
        type: "order",
        rfqId: orderId,
      })
      .returning();

    const lineValues = await Promise.all(
      lines.map(async (l) => ({
        enquiryId: enquiry.id,
        productId: l.productId,
        quantity: l.quantity,
        productVersionId: await getCurrentProductVersionId(l.productId),
      }))
    );
    const insertedItems = await db.insert(enquiryItems).values(lineValues).returning();

    // Consolidated procurement: split each line item's quantity across whichever
    // distributors carry stock (highest stock first), so the architect still sees
    // one order while fulfillment happens behind the scenes as N sub-orders.
    let totalUnallocated = 0;
    for (const item of insertedItems) {
      const { allocations, unallocated } = await allocateQuantityToDistributors(
        item.productId,
        item.quantity ?? 1
      );
      if (allocations.length > 0) {
        await db.insert(orderAllocations).values(
          allocations.map((a) => ({
            enquiryItemId: item.id,
            distributorUserId: a.distributorUserId,
            quantity: a.quantity,
          }))
        );
      }
      totalUnallocated += unallocated;
    }

    if (totalUnallocated > 0) {
      await db
        .update(enquiries)
        .set({
          message: `Order request: ${lines.length} product${lines.length > 1 ? "s" : ""} from cart. Note: ${totalUnallocated} unit(s) couldn't be matched to a distributor's known stock — you'll need to source those directly.`,
        })
        .where(eq(enquiries.id, enquiry.id));
    }
  }

  await db.delete(cartItems).where(eq(cartItems.userId, user.id));
  revalidatePath("/cart");
  revalidatePath("/architect");
  revalidatePath("/distributor");
}
