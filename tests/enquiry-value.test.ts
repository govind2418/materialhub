import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { manufacturers, products, users, enquiries, enquiryItems } from "../src/db/schema";
import { computeEnquiryValues } from "../src/lib/enquiry-value";
import { insertManufacturer, insertUser, insertProduct } from "./helpers";

describe("computeEnquiryValues", () => {
  const suffix = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let mfgId: string;
  let architectId: string;
  let productId: string;
  let enquiryId: string;

  beforeAll(async () => {
    const mfg = await insertManufacturer({ slug: `${suffix}-mfg`, name: "Vitest Mfg" });
    mfgId = mfg.id;
    const architect = await insertUser({ clerkId: `${suffix}-arch`, role: "architect", name: "Vitest Architect", email: `${suffix}@example.com` });
    architectId = architect.id;
    const product = await insertProduct({ slug: `${suffix}-p`, manufacturerId: mfgId, name: "Vitest Panel", imageUrl: "/products/placeholder.png", pricePerSheet: 1000 });
    productId = product.id;

    const [enquiry] = await db
      .insert(enquiries)
      .values({ architectUserId: architectId, manufacturerId: mfgId, type: "order" })
      .returning();
    enquiryId = enquiry.id;
    await db.insert(enquiryItems).values({ enquiryId, productId, quantity: 5 });
  });

  afterAll(async () => {
    await db.delete(enquiryItems).where(eq(enquiryItems.enquiryId, enquiryId));
    await db.delete(enquiries).where(eq(enquiries.id, enquiryId));
    await db.delete(products).where(eq(products.id, productId));
    await db.delete(manufacturers).where(eq(manufacturers.id, mfgId));
    await db.delete(users).where(eq(users.id, architectId));
  });

  it("computes quantity * pricePerSheet for a single line item", async () => {
    const values = await computeEnquiryValues([enquiryId]);
    expect(values.get(enquiryId)).toBe(5000);
  });

  it("returns an empty map for an empty enquiry ID list", async () => {
    const values = await computeEnquiryValues([]);
    expect(values.size).toBe(0);
  });

  it("skips line items whose product has no price", async () => {
    const freeProduct = await insertProduct({ slug: `${suffix}-free`, manufacturerId: mfgId, name: "No Price Panel", imageUrl: "/products/placeholder.png" });
    const [freeEnquiry] = await db
      .insert(enquiries)
      .values({ architectUserId: architectId, manufacturerId: mfgId, type: "sample_request" })
      .returning();
    await db.insert(enquiryItems).values({ enquiryId: freeEnquiry.id, productId: freeProduct.id, quantity: 1 });

    const values = await computeEnquiryValues([freeEnquiry.id]);
    expect(values.get(freeEnquiry.id) ?? 0).toBe(0);

    await db.delete(enquiryItems).where(eq(enquiryItems.enquiryId, freeEnquiry.id));
    await db.delete(enquiries).where(eq(enquiries.id, freeEnquiry.id));
    await db.delete(products).where(eq(products.id, freeProduct.id));
  });
});
