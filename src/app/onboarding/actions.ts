"use server";

import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { manufacturers, users } from "@/db/schema";

export async function completeOnboarding(formData: FormData) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const clerkUser = await currentUser();
  const role = formData.get("role") as
    | "manufacturer"
    | "architect"
    | "distributor"
    | "retailer"
    | "sales_rep";
  const name = String(formData.get("name") ?? "");
  const companyName = String(formData.get("companyName") ?? "");
  const city = String(formData.get("city") ?? "");
  const phone = String(formData.get("phone") ?? "");
  const email = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  const [user] = await db
    .insert(users)
    .values({ clerkId: userId, role, name, email, companyName, city, phone })
    .onConflictDoUpdate({
      target: users.clerkId,
      set: { role, name, companyName, city, phone },
    })
    .returning();

  if (role === "manufacturer" || role === "sales_rep") {
    const slug = companyName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    await db
      .insert(manufacturers)
      .values({
        slug: slug || `manufacturer-${user.id}`,
        name: companyName || name,
        ownerUserId: user.id,
        contactName: name,
        contactPhone: phone,
        city,
      })
      .onConflictDoNothing({ target: manufacturers.slug });

    if (role === "manufacturer") redirect("/manufacturer");
  }

  const dashboardByRole: Record<string, string> = {
    architect: "/architect",
    distributor: "/distributor",
    retailer: "/retailer",
    sales_rep: "/sales-rep",
  };

  redirect(dashboardByRole[role] ?? "/architect");
}
