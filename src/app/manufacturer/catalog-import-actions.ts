"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { readFile } from "fs/promises";
import path from "path";
import { getCurrentDbUser } from "@/lib/current-user";
import { extractProductsFromCatalog } from "@/lib/catalog-extraction";
import { computeImageSignature } from "@/lib/image-similarity";
import { db } from "@/db";
import { catalogExtractions, products } from "@/db/schema";

async function getOwnedManufacturer(userId: string) {
  return db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, userId),
  });
}

const ALLOWED_MEDIA_TYPES = new Set(["application/pdf", "image/png", "image/jpeg", "image/webp"]);

export async function uploadCatalogForExtraction(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  const extractedProducts = await extractProductsFromCatalog(bytes, file.type);

  const [extraction] = await db
    .insert(catalogExtractions)
    .values({ manufacturerId: manufacturer.id, filename: file.name, extractedProducts })
    .returning();

  redirect(`/manufacturer/catalog-import/${extraction.id}`);
}

export async function importExtractedProducts(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const extractionId = String(formData.get("extractionId"));
  const extraction = await db.query.catalogExtractions.findFirst({
    where: (e, { eq }) => eq(e.id, extractionId),
  });
  if (!extraction || extraction.manufacturerId !== manufacturer.id) return;

  const selectedIndexes = formData.getAll("include").map((v) => Number.parseInt(String(v), 10));
  if (selectedIndexes.length === 0) return;

  const placeholderBytes = await readFile(
    path.join(process.cwd(), "public", "products", "placeholder.png")
  );
  const placeholderSignature = await computeImageSignature(placeholderBytes).catch(() => null);

  const rows = selectedIndexes
    .map((idx) => extraction.extractedProducts[idx])
    .filter((p): p is NonNullable<typeof p> => !!p)
    .map((p) => {
      const slug = `${manufacturer.slug}-${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Math.random().toString(36).slice(2, 8)}`;
      return {
        slug,
        manufacturerId: manufacturer.id,
        name: p.name,
        code: p.code,
        collection: p.collection,
        category: p.category,
        woodSpecie: p.woodSpecie,
        veneerThickness: p.veneerThickness,
        base: p.base,
        finish: p.finish,
        flexibility: p.flexibility,
        weightPerPanel: p.weightPerPanel,
        panelSizes: p.panelSizes,
        imageUrl: "/products/placeholder.png",
        imageSignature: placeholderSignature,
        certifications: p.certifications,
        pricePerSheet: p.pricePerSheet,
        fireRating: p.fireRating,
        moistureResistance: p.moistureResistance,
        maintenanceLevel: p.maintenanceLevel,
      };
    });

  if (rows.length > 0) {
    await db.insert(products).values(rows);
  }

  revalidatePath("/manufacturer");
  redirect("/manufacturer");
}
