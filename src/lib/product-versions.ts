import { db } from "@/db";
import { productVersions } from "@/db/schema";

const SPEC_FIELDS = [
  "name",
  "code",
  "collection",
  "category",
  "woodSpecie",
  "veneerThickness",
  "base",
  "finish",
  "flexibility",
  "weightPerPanel",
  "panelSizes",
  "certifications",
  "installationGuideUrl",
  "pricePerSheet",
  "fireRating",
  "moistureResistance",
  "maintenanceLevel",
] as const;

function snapshotOf(product: Record<string, unknown>): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const field of SPEC_FIELDS) snapshot[field] = product[field] ?? null;
  return snapshot;
}

export async function recordProductVersion(productId: string): Promise<string | null> {
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product) return null;

  const [version] = await db
    .insert(productVersions)
    .values({ productId, snapshot: snapshotOf(product as Record<string, unknown>) })
    .returning();
  return version.id;
}

export async function getCurrentProductVersionId(productId: string): Promise<string | null> {
  const latest = await db.query.productVersions.findFirst({
    where: (v, { eq }) => eq(v.productId, productId),
    orderBy: (v, { desc }) => desc(v.createdAt),
  });
  if (latest) return latest.id;
  return recordProductVersion(productId);
}
