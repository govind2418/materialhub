import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";

const ALLOCATION_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
};

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

  const allocations = await db.query.orderAllocations.findMany({
    where: (a, { inArray }) => inArray(a.enquiryItemId, rows.map((r) => r.item.id)),
  });
  const distributorIds = [...new Set(allocations.map((a) => a.distributorUserId))];
  const distributors = distributorIds.length
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, distributorIds) })
    : [];
  const distributorById = new Map(distributors.map((d) => [d.id, d]));
  const allocationsByItem = new Map<string, typeof allocations>();
  for (const a of allocations) {
    const list = allocationsByItem.get(a.enquiryItemId) ?? [];
    list.push(a);
    allocationsByItem.set(a.enquiryItemId, list);
  }

  return (
    <div className="divide-y divide-neutral-100">
      {rows.map(({ item, product: p }) => {
        const itemAllocations = allocationsByItem.get(item.id) ?? [];
        return (
          <div key={item.id} className="py-2">
            <div className="flex items-center gap-3">
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
            {itemAllocations.length > 0 && (
              <details className="mt-1 pl-[60px]">
                <summary className="cursor-pointer text-[11px] font-medium text-terracotta-600 hover:text-terracotta-700">
                  Fulfilled from {itemAllocations.length} distributor{itemAllocations.length > 1 ? "s" : ""} →
                </summary>
                <ul className="mt-1 flex flex-col gap-0.5">
                  {itemAllocations.map((a) => (
                    <li key={a.id} className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span>
                        {distributorById.get(a.distributorUserId)?.name ?? "Unknown distributor"} — {a.quantity} units
                      </span>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 font-medium text-neutral-600">
                        {ALLOCATION_STATUS_LABEL[a.status] ?? a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        );
      })}
      {total > 0 && (
        <div className="flex items-center justify-between py-2">
          <span className="text-xs font-medium text-neutral-500">Total</span>
          <span className="text-sm font-semibold">₹{total.toLocaleString("en-IN")}</span>
        </div>
      )}
    </div>
  );
}
