"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { recordProductVersion } from "@/lib/product-versions";
import { db } from "@/db";
import { enquiries, products, productEditRequests } from "@/db/schema";

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
