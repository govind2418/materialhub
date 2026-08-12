import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { manufacturers, products } from "../src/db/schema";
import { searchProducts } from "../src/lib/product-search";
import { insertManufacturer, insertProduct } from "./helpers";

describe("searchProducts", () => {
  const suffix = `vitest${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const distinctWord = `zyxqvw${suffix}`;
  let mfgId: string;
  let testProductId: string;

  beforeAll(async () => {
    const mfg = await insertManufacturer({ slug: `${suffix}-mfg`, name: "Vitest Search Mfg" });
    mfgId = mfg.id;
    const product = await insertProduct({
      slug: `${suffix}-product`,
      manufacturerId: mfgId,
      name: `Vitest ${distinctWord} Panel`,
      imageUrl: "/products/placeholder.png",
      category: "Veneer",
    });
    testProductId = product.id;
  });

  afterAll(async () => {
    await db.delete(products).where(eq(products.id, testProductId));
    await db.delete(manufacturers).where(eq(manufacturers.id, mfgId));
  });

  it("finds a product by exact substring match", async () => {
    const results = await searchProducts({ query: distinctWord });
    expect(results.some((p) => p.id === testProductId)).toBe(true);
  });

  it("is case-insensitive", async () => {
    const results = await searchProducts({ query: distinctWord.toUpperCase() });
    expect(results.some((p) => p.id === testProductId)).toBe(true);
  });

  it("is typo-tolerant (one transposed character still matches)", async () => {
    // zyxqvw -> zyxqvw with two middle letters swapped
    const typo = distinctWord.replace("qv", "vq");
    const results = await searchProducts({ query: typo });
    expect(results.some((p) => p.id === testProductId)).toBe(true);
  });

  it("still applies exact category filters alongside a text query", async () => {
    const results = await searchProducts({ query: distinctWord, category: "Laminate" });
    expect(results.some((p) => p.id === testProductId)).toBe(false);
  });

  it("returns nothing for a query with no relation to any product", async () => {
    const results = await searchProducts({ query: "zzzznonexistentqueryxyz123" });
    expect(results.some((p) => p.id === testProductId)).toBe(false);
  });
});
