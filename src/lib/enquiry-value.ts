import { db } from "@/db";

export async function computeEnquiryValues(enquiryIds: string[]): Promise<Map<string, number>> {
  const valueByEnquiryId = new Map<string, number>();
  if (enquiryIds.length === 0) return valueByEnquiryId;

  const items = await db.query.enquiryItems.findMany({
    where: (i, { inArray }) => inArray(i.enquiryId, enquiryIds),
  });
  if (items.length === 0) return valueByEnquiryId;

  const products = await db.query.products.findMany({
    where: (p, { inArray }) => inArray(p.id, items.map((i) => i.productId)),
  });
  const productsById = new Map(products.map((p) => [p.id, p]));

  for (const item of items) {
    const product = productsById.get(item.productId);
    if (!product?.pricePerSheet) continue;
    const line = product.pricePerSheet * (item.quantity ?? 1);
    valueByEnquiryId.set(item.enquiryId, (valueByEnquiryId.get(item.enquiryId) ?? 0) + line);
  }
  return valueByEnquiryId;
}
