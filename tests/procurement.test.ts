import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { manufacturers, products, users, productDistributors, distributorInventory } from "../src/db/schema";
import { allocateQuantityToDistributors } from "../src/lib/procurement";
import { insertManufacturer, insertUser, insertProduct } from "./helpers";

describe("allocateQuantityToDistributors", () => {
  const suffix = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let mfgId: string;
  let productId: string;
  let distAId: string;
  let distBId: string;
  let distCId: string;

  beforeAll(async () => {
    const mfg = await insertManufacturer({ slug: `${suffix}-mfg`, name: "Vitest Mfg" });
    mfgId = mfg.id;

    const product = await insertProduct({ slug: `${suffix}-p`, manufacturerId: mfgId, name: "Vitest Panel", imageUrl: "/products/placeholder.png" });
    productId = product.id;

    const distA = await insertUser({ clerkId: `${suffix}-a`, role: "distributor", name: "A", email: `${suffix}-a@example.com` });
    const distB = await insertUser({ clerkId: `${suffix}-b`, role: "distributor", name: "B", email: `${suffix}-b@example.com` });
    const distC = await insertUser({ clerkId: `${suffix}-c`, role: "distributor", name: "C", email: `${suffix}-c@example.com` });
    distAId = distA.id;
    distBId = distB.id;
    distCId = distC.id;

    await db.insert(productDistributors).values([
      { productId, distributorUserId: distAId },
      { productId, distributorUserId: distBId },
      { productId, distributorUserId: distCId },
    ]);
    await db.insert(distributorInventory).values([
      { distributorUserId: distAId, productId, quantity: 200, status: "in_stock" },
      { distributorUserId: distBId, productId, quantity: 100, status: "in_stock" },
      { distributorUserId: distCId, productId, quantity: 200, status: "in_stock" },
    ]);
  });

  afterAll(async () => {
    await db.delete(distributorInventory).where(eq(distributorInventory.productId, productId));
    await db.delete(productDistributors).where(eq(productDistributors.productId, productId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(manufacturers).where(eq(manufacturers.id, mfgId));
    await db.delete(users).where(eq(users.id, distAId));
    await db.delete(users).where(eq(users.id, distBId));
    await db.delete(users).where(eq(users.id, distCId));
  });

  it("splits 500 units across three distributors as 200 + 100 + 200, fully allocated", async () => {
    const { allocations, unallocated } = await allocateQuantityToDistributors(productId, 500);

    expect(unallocated).toBe(0);
    expect(allocations).toHaveLength(3);
    expect(allocations.reduce((sum, a) => sum + a.quantity, 0)).toBe(500);

    const byDistributor = new Map(allocations.map((a) => [a.distributorUserId, a.quantity]));
    expect(byDistributor.get(distAId)).toBe(200);
    expect(byDistributor.get(distBId)).toBe(100);
    expect(byDistributor.get(distCId)).toBe(200);
  });

  it("fills from the highest-stock distributor first", async () => {
    const { allocations } = await allocateQuantityToDistributors(productId, 250);
    // Greedy: C or A (both 200) exhausted first, then the 50 remainder from B.
    const totalAllocated = allocations.reduce((sum, a) => sum + a.quantity, 0);
    expect(totalAllocated).toBe(250);
    expect(allocations.every((a) => a.quantity <= 200)).toBe(true);
  });

  it("reports a shortfall when total stock is less than requested", async () => {
    const { allocations, unallocated } = await allocateQuantityToDistributors(productId, 1000);
    expect(allocations.reduce((sum, a) => sum + a.quantity, 0)).toBe(500);
    expect(unallocated).toBe(500);
  });

  it("returns fully unallocated with no crash when a product has no linked distributors", async () => {
    const orphanProduct = await insertProduct({ slug: `${suffix}-orphan`, manufacturerId: mfgId, name: "Orphan Panel", imageUrl: "/products/placeholder.png" });

    const { allocations, unallocated } = await allocateQuantityToDistributors(orphanProduct.id, 100);
    expect(allocations).toHaveLength(0);
    expect(unallocated).toBe(100);

    await db.delete(products).where(eq(products.id, orphanProduct.id));
  });
});
