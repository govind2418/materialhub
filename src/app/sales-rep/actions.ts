"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "sales_rep") return;

  const enquiryId = String(formData.get("enquiryId"));
  const status = String(formData.get("status")) as "new" | "responded" | "closed";

  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.assignedSalesRepUserId !== user.id) return;

  await db.update(enquiries).set({ status }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/sales-rep");
}

export async function updateSampleStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "sales_rep") return;

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
  if (!enquiry || enquiry.assignedSalesRepUserId !== user.id) return;

  await db.update(enquiries).set({ sampleStatus }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/sales-rep");
}

export async function markLeadContacted(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "sales_rep") return;

  const enquiryId = String(formData.get("enquiryId"));
  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.assignedSalesRepUserId !== user.id) return;

  await db
    .update(enquiries)
    .set({ lastContactedAt: new Date() })
    .where(eq(enquiries.id, enquiryId));
  revalidatePath("/sales-rep");
}
