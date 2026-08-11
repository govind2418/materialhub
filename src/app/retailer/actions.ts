"use server";

import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries, enquiryItems, products } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function requestRestock(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "retailer") return;

  const productId = String(formData.get("productId"));

  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  if (!product) return;

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      architectUserId: user.id,
      manufacturerId: product.manufacturerId,
      message: `Restock request for ${product.name}${product.code ? ` (${product.code})` : ""}.`,
      type: "restock",
    })
    .returning();

  await db.insert(enquiryItems).values({ enquiryId: enquiry.id, productId });

  revalidatePath("/retailer");
}
