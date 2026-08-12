import { db } from "@/db";

export type Allocation = { distributorUserId: string; quantity: number };

/**
 * Greedy allocation: fills the needed quantity from the distributor with the
 * most stock first, then the next, until the quantity is met or known stock
 * runs out. This is what lets an architect's single "500 sheets" order become
 * 3 sub-orders (200 + 100 + 200) behind the scenes while still reading as one
 * consolidated order.
 */
export async function allocateQuantityToDistributors(
  productId: string,
  neededQuantity: number
): Promise<{ allocations: Allocation[]; unallocated: number }> {
  const links = await db.query.productDistributors.findMany({
    where: (d, { eq }) => eq(d.productId, productId),
  });
  if (links.length === 0) return { allocations: [], unallocated: neededQuantity };

  const distributorIds = [...new Set(links.map((l) => l.distributorUserId))];
  const inventoryRows = await db.query.distributorInventory.findMany({
    where: (i, { and, eq, inArray }) =>
      and(eq(i.productId, productId), inArray(i.distributorUserId, distributorIds)),
  });

  const stockByDistributor = new Map(
    inventoryRows
      .filter((i) => i.quantity != null && i.quantity > 0)
      .map((i) => [i.distributorUserId, i.quantity!])
  );

  const ranked = [...stockByDistributor.entries()].sort((a, b) => b[1] - a[1]);

  const allocations: Allocation[] = [];
  let remaining = neededQuantity;
  for (const [distributorUserId, stock] of ranked) {
    if (remaining <= 0) break;
    const take = Math.min(stock, remaining);
    allocations.push({ distributorUserId, quantity: take });
    remaining -= take;
  }

  return { allocations, unallocated: remaining };
}
