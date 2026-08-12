"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { distributorInventory, orderAllocations } from "@/db/schema";

export async function updateStockStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "distributor") return;

  const productId = String(formData.get("productId"));
  const status = String(formData.get("status")) as
    | "in_stock"
    | "low_stock"
    | "out_of_stock";
  const quantityRaw = String(formData.get("quantity") ?? "").trim();
  const quantity = quantityRaw ? Number.parseInt(quantityRaw, 10) : null;

  const existing = await db.query.distributorInventory.findFirst({
    where: (i, { and, eq }) =>
      and(eq(i.distributorUserId, user.id), eq(i.productId, productId)),
  });

  if (existing) {
    await db
      .update(distributorInventory)
      .set({ status, quantity, updatedAt: new Date() })
      .where(eq(distributorInventory.id, existing.id));
  } else {
    await db.insert(distributorInventory).values({
      distributorUserId: user.id,
      productId,
      status,
      quantity,
    });
  }

  revalidatePath("/distributor");
}

export async function updateAllocationStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "distributor") return;

  const allocationId = String(formData.get("allocationId"));
  const status = String(formData.get("status")) as
    | "pending"
    | "confirmed"
    | "dispatched"
    | "delivered";

  const allocation = await db.query.orderAllocations.findFirst({
    where: (a, { eq }) => eq(a.id, allocationId),
  });
  if (!allocation || allocation.distributorUserId !== user.id) return;

  await db.update(orderAllocations).set({ status }).where(eq(orderAllocations.id, allocationId));
  revalidatePath("/distributor");
  revalidatePath("/architect");
}
