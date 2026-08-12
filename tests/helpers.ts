import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { manufacturers, users, products } from "../src/db/schema";

/**
 * Neon's HTTP driver occasionally retries a slow-but-successful insert,
 * surfacing a unique-constraint error from the retry even though the first
 * attempt committed. Insert-then-fallback-to-select makes test setup
 * resilient to that instead of failing the whole suite on a network blip.
 */
export async function insertManufacturer(values: { slug: string; name: string }) {
  try {
    const [row] = await db.insert(manufacturers).values(values).returning();
    return row;
  } catch {
    const existing = await db.query.manufacturers.findFirst({ where: eq(manufacturers.slug, values.slug) });
    if (existing) return existing;
    throw new Error(`Failed to insert or find manufacturer with slug ${values.slug}`);
  }
}

export async function insertProduct(values: {
  slug: string;
  manufacturerId: string;
  name: string;
  imageUrl: string;
  [key: string]: unknown;
}) {
  try {
    const [row] = await db.insert(products).values(values).returning();
    return row;
  } catch {
    const existing = await db.query.products.findFirst({ where: eq(products.slug, values.slug) });
    if (existing) return existing;
    throw new Error(`Failed to insert or find product with slug ${values.slug}`);
  }
}

export async function insertUser(values: {
  clerkId: string;
  role: "manufacturer" | "architect" | "distributor" | "retailer" | "sales_rep";
  name: string;
  email: string;
}) {
  try {
    const [row] = await db.insert(users).values(values).returning();
    return row;
  } catch {
    const existing = await db.query.users.findFirst({ where: eq(users.clerkId, values.clerkId) });
    if (existing) return existing;
    throw new Error(`Failed to insert or find user with clerkId ${values.clerkId}`);
  }
}
