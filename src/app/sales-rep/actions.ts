"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "sales_rep") return;

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, user.id),
  });
  if (!manufacturer) return;

  const enquiryId = String(formData.get("enquiryId"));
  const status = String(formData.get("status")) as "new" | "responded" | "closed";

  const enquiry = await db.query.enquiries.findFirst({
    where: (e, { eq }) => eq(e.id, enquiryId),
  });
  if (!enquiry || enquiry.manufacturerId !== manufacturer.id) return;

  await db.update(enquiries).set({ status }).where(eq(enquiries.id, enquiryId));
  revalidatePath("/sales-rep");
}
