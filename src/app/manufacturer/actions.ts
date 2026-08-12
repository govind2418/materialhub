"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getCurrentDbUser } from "@/lib/current-user";
import { recordProductVersion } from "@/lib/product-versions";
import { db } from "@/db";
import {
  products,
  enquiries,
  relatedProducts,
  productDistributors,
  manufacturerTeamMembers,
  productEditRequests,
} from "@/db/schema";
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
  const certificationsRaw = String(formData.get("certifications") ?? "");
  const certifications = certificationsRaw
    ? certificationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
    : null;
  const installationGuideUrl = String(formData.get("installationGuideUrl") ?? "") || null;
  const pricePerSheetRaw = String(formData.get("pricePerSheet") ?? "").trim();
  const pricePerSheet = pricePerSheetRaw ? Number.parseInt(pricePerSheetRaw, 10) : null;
  const fireRating = String(formData.get("fireRating") ?? "").trim() || null;
  const moistureResistance = String(formData.get("moistureResistance") ?? "").trim() || null;
  const maintenanceLevel = String(formData.get("maintenanceLevel") ?? "").trim() || null;

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
    certifications,
    installationGuideUrl,
    pricePerSheet,
    fireRating,
    moistureResistance,
    maintenanceLevel,
  });

  revalidatePath("/manufacturer");
}

const EDITABLE_FIELDS = [
  "name",
  "code",
  "collection",
  "category",
  "woodSpecie",
  "finish",
  "panelSizes",
  "certifications",
  "installationGuideUrl",
  "pricePerSheet",
  "fireRating",
  "moistureResistance",
  "maintenanceLevel",
] as const;

export async function updateProduct(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const productId = String(formData.get("productId"));
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product || product.manufacturerId !== manufacturer.id) return;

  const panelSizesRaw = String(formData.get("panelSizes") ?? "");
  const certificationsRaw = String(formData.get("certifications") ?? "");
  const pricePerSheetRaw = String(formData.get("pricePerSheet") ?? "").trim();

  const submitted: Record<string, unknown> = {
    name: String(formData.get("name") ?? "").trim(),
    code: String(formData.get("code") ?? "").trim() || null,
    collection: String(formData.get("collection") ?? "").trim() || null,
    category: String(formData.get("category") ?? "").trim() || null,
    woodSpecie: String(formData.get("woodSpecie") ?? "").trim() || null,
    finish: String(formData.get("finish") ?? "").trim() || null,
    panelSizes: panelSizesRaw
      ? panelSizesRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
    certifications: certificationsRaw
      ? certificationsRaw.split(",").map((s) => s.trim()).filter(Boolean)
      : null,
    installationGuideUrl: String(formData.get("installationGuideUrl") ?? "").trim() || null,
    pricePerSheet: pricePerSheetRaw ? Number.parseInt(pricePerSheetRaw, 10) : null,
    fireRating: String(formData.get("fireRating") ?? "").trim() || null,
    moistureResistance: String(formData.get("moistureResistance") ?? "").trim() || null,
    maintenanceLevel: String(formData.get("maintenanceLevel") ?? "").trim() || null,
  };

  const changedFields: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    const next = submitted[key];
    const current = (product as Record<string, unknown>)[key];
    const same = Array.isArray(next)
      ? JSON.stringify(next) === JSON.stringify(current ?? null)
      : next === current;
    if (!same) changedFields[key] = next;
  }
  if (Object.keys(changedFields).length === 0) return;

  const isAlreadyVerified = product.verificationStatus !== "pending";

  if (isAlreadyVerified) {
    await db.insert(productEditRequests).values({
      productId: product.id,
      proposedChanges: changedFields,
    });
    await db.update(products).set({ needsReview: true }).where(eq(products.id, product.id));
  } else {
    await db
      .update(products)
      .set({ ...changedFields, updatedAt: new Date() })
      .where(eq(products.id, product.id));
    await recordProductVersion(product.id);
  }

  revalidatePath("/manufacturer");
}

export async function linkRelatedProduct(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const productId = String(formData.get("productId"));
  const relatedProductId = String(formData.get("relatedProductId"));
  const relationType = String(formData.get("relationType") ?? "alternative_to") as
    | "alternative_to"
    | "compatible_with"
    | "used_with"
    | "similar_to";
  if (!relatedProductId || productId === relatedProductId) return;

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product || product.manufacturerId !== manufacturer.id) return;

  await db.insert(relatedProducts).values({ productId, relatedProductId, relationType });
  revalidatePath("/manufacturer");
}

export async function assignDistributor(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const productId = String(formData.get("productId"));
  const distributorUserId = String(formData.get("distributorUserId"));
  if (!distributorUserId) return;

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product || product.manufacturerId !== manufacturer.id) return;

  await db.insert(productDistributors).values({ productId, distributorUserId });
  revalidatePath("/manufacturer");
}

export async function toggleProductVerification(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const productId = String(formData.get("productId"));
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.id, productId),
  });
  if (!product || product.manufacturerId !== manufacturer.id) return;

  const nextStatus = product.verificationStatus === "pending" ? "manufacturer_verified" : "pending";
  await db
    .update(products)
    .set({ verificationStatus: nextStatus })
    .where(eq(products.id, productId));
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

export async function inviteTeamMember(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role")) as "distributor" | "sales_rep";
  if (!email || !role) return;

  const existingUser = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.email, email), eq(u.role, role)),
  });

  await db.insert(manufacturerTeamMembers).values({
    manufacturerId: manufacturer.id,
    email,
    role,
    userId: existingUser?.id,
    status: existingUser ? "active" : "invited",
  });

  revalidatePath("/manufacturer");
}

export async function removeTeamMember(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const memberId = String(formData.get("memberId"));
  const member = await db.query.manufacturerTeamMembers.findFirst({
    where: (m, { eq }) => eq(m.id, memberId),
  });
  if (!member || member.manufacturerId !== manufacturer.id) return;

  await db
    .delete(manufacturerTeamMembers)
    .where(eq(manufacturerTeamMembers.id, memberId));
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

export async function updateSampleStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const sampleStatus = String(formData.get("sampleStatus")) as
    | "requested"
    | "dispatched"
    | "delivered"
    | "approved"
    | "rejected";

  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  await db.update(enquiries).set({ sampleStatus }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/manufacturer");
}

export async function assignLead(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const salesRepUserId = String(formData.get("salesRepUserId")) || null;

  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  await db
    .update(enquiries)
    .set({ assignedSalesRepUserId: salesRepUserId })
    .where(eq(enquiries.id, enquiryId));
  revalidatePath("/manufacturer");
}

export async function submitQuote(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  const quotedPriceRaw = String(formData.get("quotedPrice") ?? "").trim();
  const quotedDeliveryDaysRaw = String(formData.get("quotedDeliveryDays") ?? "").trim();
  const freightCostRaw = String(formData.get("freightCost") ?? "").trim();
  const paymentTerms = String(formData.get("paymentTerms") ?? "").trim() || null;
  const validUntilRaw = String(formData.get("validUntil") ?? "").trim();

  await db
    .update(enquiries)
    .set({
      quotedPrice: quotedPriceRaw ? Number.parseInt(quotedPriceRaw, 10) : null,
      quotedDeliveryDays: quotedDeliveryDaysRaw ? Number.parseInt(quotedDeliveryDaysRaw, 10) : null,
      freightCost: freightCostRaw ? Number.parseInt(freightCostRaw, 10) : null,
      paymentTerms,
      validUntil: validUntilRaw ? new Date(validUntilRaw) : null,
    })
    .where(eq(enquiries.id, enquiryId));
  revalidatePath("/manufacturer");
  revalidatePath("/architect");
}

export async function markLeadContacted(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "manufacturer") return;

  const manufacturer = await getOwnedManufacturer(user.id);
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  await db
    .update(enquiries)
    .set({ lastContactedAt: new Date() })
    .where(eq(enquiries.id, enquiryId));
  revalidatePath("/manufacturer");
}
