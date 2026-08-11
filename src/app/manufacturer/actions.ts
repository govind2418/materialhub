"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { products, enquiries } from "@/db/schema";
import { eq } from "drizzle-orm";

async function getOwnedManufacturer(userId: string) {
  return db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, userId),
  });
}

export async function createProduct(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const name = String(formData.get("name") ?? "");
  const code = String(formData.get("code") ?? "") || null;
  const collection = String(formData.get("collection") ?? "") || null;
  const category = String(formData.get("category") ?? "") || null;
  const woodSpecie = String(formData.get("woodSpecie") ?? "") || null;
  const finish = String(formData.get("finish") ?? "") || null;
  const panelSizesRaw = String(formData.get("panelSizes") ?? "");
  const panelSizes = panelSizesRaw
    ? panelSizesRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;

  const file = formData.get("image") as File | null;
  let imageUrl = "/products/placeholder.png";

  if (file && file.size > 0) {
    const bytes = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const filename = `${manufacturer.slug}-${Date.now()}.${ext}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), bytes);
    imageUrl = `/uploads/${filename}`;
  }

  const slug = `${manufacturer.slug}-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;

  await db.insert(products).values({
    slug,
    manufacturerId: manufacturer.id,
    name,
    code,
    collection,
    category,
    woodSpecie,
    finish,
    panelSizes,
    imageUrl,
  });

  revalidatePath("/manufacturer");
}

export async function deleteProduct(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const productId = String(formData.get("productId"));
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product || product.manufacturerId !== manufacturer.id) return;

  await db.delete(products).where(eq(products.id, productId));
  revalidatePath("/manufacturer");
}

export async function updateEnquiryStatus(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const status = String(formData.get("status")) as "new" | "responded" | "closed";

  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  await db.update(enquiries).set({ status }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/manufacturer");
}
