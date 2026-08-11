import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { updateStockStatus } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  in_stock: "In stock",
  low_stock: "Low stock",
  out_of_stock: "Out of stock",
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

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Stock &amp; territory</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Set availability for products you carry. {user.city && `Territory: ${user.city}.`}
        </p>

        <div className="mt-8 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
          {products.map((p) => {
            const status = statusByProduct.get(p.id) ?? "in_stock";
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
                    className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-neutral-500"
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
