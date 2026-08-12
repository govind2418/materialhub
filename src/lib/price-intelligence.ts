import { db } from "@/db";

export type CategoryPriceStats = {
  category: string;
  listedCount: number;
  listedMin: number | null;
  listedAvg: number | null;
  listedMax: number | null;
  quotedCount: number;
  quotedMin: number | null;
  quotedAvg: number | null;
  quotedMax: number | null;
};

function summarize(values: number[]): { min: number; avg: number; max: number } | null {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
  return { min, avg, max };
}

export async function getCategoryPriceStats(): Promise<Map<string, CategoryPriceStats>> {
  const allProducts = await db.query.products.findMany();
  const productsById = new Map(allProducts.map((p) => [p.id, p]));

  const stats = new Map<string, CategoryPriceStats>();
  const ensure = (category: string) => {
    if (!stats.has(category)) {
      stats.set(category, {
        category,
        listedCount: 0,
        listedMin: null,
        listedAvg: null,
        listedMax: null,
        quotedCount: 0,
        quotedMin: null,
        quotedAvg: null,
        quotedMax: null,
      });
    }
    return stats.get(category)!;
  };

  const listedByCategory = new Map<string, number[]>();
  for (const p of allProducts) {
    if (!p.category || p.pricePerSheet == null) continue;
    const list = listedByCategory.get(p.category) ?? [];
    list.push(p.pricePerSheet);
    listedByCategory.set(p.category, list);
  }
  for (const [category, values] of listedByCategory) {
    const s = summarize(values);
    if (!s) continue;
    const entry = ensure(category);
    entry.listedCount = values.length;
    entry.listedMin = s.min;
    entry.listedAvg = s.avg;
    entry.listedMax = s.max;
  }

  const quotedEnquiries = await db.query.enquiries.findMany({
    where: (e, { isNotNull }) => isNotNull(e.quotedPrice),
  });
  if (quotedEnquiries.length > 0) {
    const items = await db.query.enquiryItems.findMany({
      where: (i, { inArray }) => inArray(i.enquiryId, quotedEnquiries.map((e) => e.id)),
    });
    const quotedByCategory = new Map<string, number[]>();
    const enquiriesById = new Map(quotedEnquiries.map((e) => [e.id, e]));
    const seenEnquiryCategory = new Set<string>();
    for (const item of items) {
      const enquiry = enquiriesById.get(item.enquiryId);
      const product = productsById.get(item.productId);
      if (!enquiry?.quotedPrice || !product?.category) continue;
      // Count each enquiry's quote once per category (a quote is for the whole RFQ,
      // not per line item), so a multi-item quote doesn't over-weight the average.
      const dedupeKey = `${enquiry.id}:${product.category}`;
      if (seenEnquiryCategory.has(dedupeKey)) continue;
      seenEnquiryCategory.add(dedupeKey);
      const list = quotedByCategory.get(product.category) ?? [];
      list.push(enquiry.quotedPrice);
      quotedByCategory.set(product.category, list);
    }
    for (const [category, values] of quotedByCategory) {
      const s = summarize(values);
      if (!s) continue;
      const entry = ensure(category);
      entry.quotedCount = values.length;
      entry.quotedMin = s.min;
      entry.quotedAvg = s.avg;
      entry.quotedMax = s.max;
    }
  }

  return stats;
}
