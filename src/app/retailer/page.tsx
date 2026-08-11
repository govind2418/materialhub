import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { requestRestock } from "./actions";

export default async function RetailerDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "retailer") redirect("/");

  const products = await db.query.products.findMany({
    orderBy: (p, { asc }) => asc(p.name),
  });

  const myRequests = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.architectUserId, user.id),
    orderBy: (e, { desc }) => desc(e.createdAt),
  });

  const manufacturersById = new Map(
    (await db.query.manufacturers.findMany()).map((m) => [m.id, m])
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Reorder</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Browse products and request a restock from the manufacturer.
        </p>

        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
              <div className="relative aspect-square w-full bg-neutral-100">
                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{p.name}</p>
                <p className="truncate text-xs text-neutral-500">{p.code}</p>
                <form action={requestRestock} className="mt-2">
                  <input type="hidden" name="productId" value={p.id} />
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-terracotta-500 px-3 py-1.5 text-xs font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
                  >
                    Request restock
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>

        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Your restock requests</h2>
          {myRequests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No restock requests yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {myRequests.map((e) => (
                <div key={e.id} className="flex items-start justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">
                      {manufacturersById.get(e.manufacturerId)?.name}
                    </p>
                    {e.message && <p className="mt-1 text-sm text-neutral-500">{e.message}</p>}
                  </div>
                  <span className="shrink-0 rounded-full bg-terracotta-50 px-2.5 py-1 text-xs font-medium text-terracotta-700">
                    {e.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
