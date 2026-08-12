import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { updateStockStatus, updateAllocationStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
};

const ALLOCATION_STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  dispatched: "Dispatched",
  delivered: "Delivered",
};

export default async function DistributorDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "distributor") redirect("/");

  const products = await db.query.products.findMany({
    orderBy: (p, { asc }) => asc(p.name),
  });

  const inventory = await db.query.distributorInventory.findMany({
    where: (i, { eq }) => eq(i.distributorUserId, user.id),
  });
  const statusByProduct = new Map(inventory.map((i) => [i.productId, i.status]));
  const quantityByProduct = new Map(inventory.map((i) => [i.productId, i.quantity]));

  const myAllocations = await db.query.orderAllocations.findMany({
    where: (a, { eq }) => eq(a.distributorUserId, user.id),
    orderBy: (a, { desc }) => desc(a.createdAt),
  });
  const allocationItemIds = myAllocations.map((a) => a.enquiryItemId);
  const allocationItems = allocationItemIds.length
    ? await db.query.enquiryItems.findMany({
        where: (i, { inArray }) => inArray(i.id, allocationItemIds),
      })
    : [];
  const allocationItemById = new Map(allocationItems.map((i) => [i.id, i]));
  const allocationProductIds = [...new Set(allocationItems.map((i) => i.productId))];
  const allocationProducts = allocationProductIds.length
    ? await db.query.products.findMany({ where: (p, { inArray }) => inArray(p.id, allocationProductIds) })
    : [];
  const allocationProductById = new Map(allocationProducts.map((p) => [p.id, p]));
  const allocationEnquiryIds = [...new Set(allocationItems.map((i) => i.enquiryId))];
  const allocationEnquiries = allocationEnquiryIds.length
    ? await db.query.enquiries.findMany({ where: (e, { inArray }) => inArray(e.id, allocationEnquiryIds) })
    : [];
  const allocationEnquiryById = new Map(allocationEnquiries.map((e) => [e.id, e]));
  const architectIds = [...new Set(allocationEnquiries.map((e) => e.architectUserId))];
  const architects = architectIds.length
    ? await db.query.users.findMany({ where: (u, { inArray }) => inArray(u.id, architectIds) })
    : [];
  const architectById = new Map(architects.map((a) => [a.id, a]));

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Stock &amp; territory</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Set availability for products you carry. {user.city && `Territory: ${user.city}.`}
        </p>

        <h2 className="mb-4 mt-10 text-lg font-semibold">
          Orders to fulfill ({myAllocations.length})
        </h2>
        {myAllocations.length === 0 ? (
          <p className="mb-10 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
            No orders allocated to you yet. This fills in automatically when an architect
            orders more than a single distributor can cover and your stock is used to help
            fulfill it.
          </p>
        ) : (
          <div className="mb-10 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
            {myAllocations.map((a) => {
              const item = allocationItemById.get(a.enquiryItemId);
              const product = item ? allocationProductById.get(item.productId) : null;
              const enquiry = item ? allocationEnquiryById.get(item.enquiryId) : null;
              const architect = enquiry ? architectById.get(enquiry.architectUserId) : null;
              return (
                <div key={a.id} className="flex items-center gap-4 p-4">
                  {product && (
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                      <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{product?.name ?? "Unknown product"}</p>
                    <p className="text-xs text-neutral-500">
                      {a.quantity} units for {architect?.name ?? "an architect"}
                      {item?.quantity && item.quantity !== a.quantity && ` (of ${item.quantity} total)`}
                    </p>
                  </div>
                  <form action={updateAllocationStatus} className="flex items-center gap-2">
                    <input type="hidden" name="allocationId" value={a.id} />
                    <select
                      name="status"
                      defaultValue={a.status}
                      className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                    >
                      {Object.entries(ALLOCATION_STATUS_LABEL).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                    >
                      Save
                    </button>
                  </form>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="mb-4 text-lg font-semibold">Your catalog availability</h2>
        <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {products.map((p) => {
            const status = statusByProduct.get(p.id) ?? "in_stock";
            const quantity = quantityByProduct.get(p.id);
            return (
              <div key={p.id} className="flex items-center gap-4 p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                  <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{p.name}</p>
                  <p className="text-xs text-neutral-500">{p.code}</p>
                </div>
                <form action={updateStockStatus} className="flex items-center gap-2">
                  <input type="hidden" name="productId" value={p.id} />
                  <input
                    type="number"
                    name="quantity"
                    min="0"
                    defaultValue={quantity ?? ""}
                    placeholder="Qty"
                    className="w-16 rounded-full border border-neutral-300 px-2.5 py-1 text-xs"
                  />
                  <select
                    name="status"
                    defaultValue={status}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                      status === "in_stock"
                        ? "border-green-300 text-green-700"
                        : status === "low_stock"
                          ? "border-amber-300 text-amber-700"
                          : "border-red-300 text-red-700"
                    }`}
                  >
                    {Object.entries(STATUS_LABEL).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                  >
                    Save
                  </button>
                </form>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
