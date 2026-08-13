"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { recordProductVersion } from "@/lib/product-versions";
import { db } from "@/db";
import { enquiries, products, productEditRequests, projectReferences, guides, premiumMemberships } from "@/db/schema";

async function requireAdmin() {
  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  return isAdminEmail(email);
}

export async function togglePaidStatus(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const enquiryId = String(formData.get("enquiryId"));
  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry) return;

  const next = enquiry.paidStatus === "paid" ? "unpaid" : "paid";
  await db.update(enquiries).set({ paidStatus: next }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/admin");
}

async function hasOtherPendingRequests(productId: string, excludingId: string) {
  const remaining = await db.query.productEditRequests.findMany({
    where: (r, { and, eq }) => and(eq(r.productId, productId), eq(r.status, "pending")),
  });
  return remaining.some((r) => r.id !== excludingId);
}

export async function approveEditRequest(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const requestId = String(formData.get("requestId"));
  const request = await db.query.productEditRequests.findFirst({
    where: (r, { eq }) => eq(r.id, requestId),
  });
  if (!request || request.status !== "pending") return;

  await db
    .update(products)
    .set({ ...request.proposedChanges, updatedAt: new Date() })
    .where(eq(products.id, request.productId));
  await recordProductVersion(request.productId);

  await db
    .update(productEditRequests)
    .set({ status: "approved", reviewedAt: new Date() })
    .where(eq(productEditRequests.id, requestId));

  if (!(await hasOtherPendingRequests(request.productId, requestId))) {
    await db.update(products).set({ needsReview: false }).where(eq(products.id, request.productId));
  }

  revalidatePath("/admin");
  revalidatePath("/manufacturer");
}

export async function rejectEditRequest(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const requestId = String(formData.get("requestId"));
  const request = await db.query.productEditRequests.findFirst({
    where: (r, { eq }) => eq(r.id, requestId),
  });
  if (!request || request.status !== "pending") return;

  await db
    .update(productEditRequests)
    .set({ status: "rejected", reviewedAt: new Date() })
    .where(eq(productEditRequests.id, requestId));

  if (!(await hasOtherPendingRequests(request.productId, requestId))) {
    await db.update(products).set({ needsReview: false }).where(eq(products.id, request.productId));
  }

  revalidatePath("/admin");
  revalidatePath("/manufacturer");
}

export async function deleteProjectReferenceAdmin(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const referenceId = String(formData.get("referenceId"));
  await db.delete(projectReferences).where(eq(projectReferences.id, referenceId));
  revalidatePath("/admin");
  revalidatePath("/manufacturer");
}

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function createGuide(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim();
  if (!content) return;
  const category = String(formData.get("category") ?? "").trim() || null;
  const published = formData.get("published") === "on";

  const baseSlug = slugify(title);
  const slug = `${baseSlug}-${Date.now().toString(36)}`;

  await db.insert(guides).values({ slug, title, summary, content, category, published });
  revalidatePath("/admin");
  revalidatePath("/learn");
}

export async function toggleGuidePublished(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const guideId = String(formData.get("guideId"));
  const guide = await db.query.guides.findFirst({ where: (g, { eq }) => eq(g.id, guideId) });
  if (!guide) return;

  await db.update(guides).set({ published: !guide.published }).where(eq(guides.id, guideId));
  revalidatePath("/admin");
  revalidatePath("/learn");
}

export async function deleteGuide(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const guideId = String(formData.get("guideId"));
  await db.delete(guides).where(eq(guides.id, guideId));
  revalidatePath("/admin");
  revalidatePath("/learn");
}

export async function activatePremiumMembership(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const membershipId = String(formData.get("membershipId"));
  const membership = await db.query.premiumMemberships.findFirst({
    where: (m, { eq }) => eq(m.id, membershipId),
  });
  if (!membership || membership.status !== "pending") return;

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  await db
    .update(premiumMemberships)
    .set({ status: "active", activatedAt: new Date(), expiresAt })
    .where(eq(premiumMemberships.id, membershipId));

  revalidatePath("/admin");
  revalidatePath("/architect/premium");
  revalidatePath("/architect/community");
}

export async function rejectPremiumMembership(formData: FormData): Promise<void> {
  if (!(await requireAdmin())) return;

  const membershipId = String(formData.get("membershipId"));
  const membership = await db.query.premiumMemberships.findFirst({
    where: (m, { eq }) => eq(m.id, membershipId),
  });
  if (!membership || membership.status !== "pending") return;

  await db.update(premiumMemberships).set({ status: "rejected" }).where(eq(premiumMemberships.id, membershipId));
  revalidatePath("/admin");
  revalidatePath("/architect/premium");
}
