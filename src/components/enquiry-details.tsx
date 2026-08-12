import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";

export async function EnquiryDetails({ enquiryId }: { enquiryId: string }) {
  const items = await db.query.enquiryItems.findMany({
    where: (i, { eq }) => eq(i.enquiryId, enquiryId),
  });
  const products = await Promise.all(
    items.map((i) => db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) }))
  );
  const rows = items
    .map((item, idx) => ({ item, product: products[idx] }))
    .filter((r) => r.product);

  if (rows.length === 0) {
    return <p className="px-1 py-2 text-xs text-neutral-400">No products attached to this request.</p>;
  }

  const total = rows.reduce(
    (sum, r) => sum + (r.product!.pricePerSheet ?? 0) * (r.item.quantity ?? 1),
    0
  );

  return (
    <div className="divide-y divide-neutral-100">
      {rows.map(({ item, product: p }) => (
        <div key={item.id} className="flex items-center gap-3 py-2">
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
            <Image src={p!.imageUrl} alt={p!.name} fill className="object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <Link href={`/catalog/${p!.slug}`} className="block truncate text-sm font-medium hover:text-terracotta-600">
              {p!.name}
            </Link>
            <p className="truncate text-xs text-neutral-500">{p!.code}</p>
          </div>
          <p className="shrink-0 text-xs text-neutral-600">Qty: {item.quantity ?? 1}</p>
          {p!.pricePerSheet != null && (
            <p className="w-20 shrink-0 text-right text-xs font-medium text-neutral-900">
              ₹{((p!.pricePerSheet ?? 0) * (item.quantity ?? 1)).toLocaleString("en-IN")}
            </p>
          )}
        </div>
      ))}
      {total > 0 && (
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-medium text-neutral-500">Total</span>
          <span className="text-sm font-semibold">₹{total.toLocaleString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}
