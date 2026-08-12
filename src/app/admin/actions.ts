"use server";

import { currentUser } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { isAdminEmail } from "@/lib/admin";
import { db } from "@/db";
import { enquiries } from "@/db/schema";

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
