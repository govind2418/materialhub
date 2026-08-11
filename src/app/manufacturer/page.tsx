import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { createProduct, deleteProduct, updateEnquiryStatus } from "./actions";

export default async function ManufacturerDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "manufacturer") redirect("/architect");

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.ownerUserId, user.id),
  });

  const myProducts = manufacturer
    ? await db.query.products.findMany({
        where: (p, { eq }) => eq(p.manufacturerId, manufacturer.id),
        orderBy: (p, { desc }) => desc(p.createdAt),
      })
    : [];

  const myEnquiries = manufacturer
    ? await db.query.enquiries.findMany({
        where: (e, { eq }) => eq(e.manufacturerId, manufacturer.id),
        orderBy: (e, { desc }) => desc(e.createdAt),
      })
    : [];

  const enquiryItemsByEnquiry = myEnquiries.length
    ? await db.query.enquiryItems.findMany({
        where: (i, { inArray }) =>
          inArray(i.enquiryId, myEnquiries.map((e) => e.id)),
      })
    : [];

  const enquiryCountByProduct = new Map<string, number>();
  for (const item of enquiryItemsByEnquiry) {
    enquiryCountByProduct.set(
      item.productId,
      (enquiryCountByProduct.get(item.productId) ?? 0) + 1
    );
  }

  const analyticsRows = [...myProducts]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">{manufacturer?.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Manage your catalog and respond to enquiries.
        </p>

        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_320px]">
          <section>
            <h2 className="mb-4 text-lg font-semibold">Your products ({myProducts.length})</h2>
            {myProducts.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
                No products yet. Add your first one using the form.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {myProducts.map((p) => (
                  <div key={p.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                    <div className="relative aspect-square w-full bg-neutral-100">
                      <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="truncate text-xs text-neutral-500">{p.code}</p>
                      <form action={deleteProduct} className="mt-2">
                        <input type="hidden" name="productId" value={p.id} />
                        <button className="text-xs text-neutral-400 hover:text-red-600">
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <h2 className="mb-4 mt-14 text-lg font-semibold">Analytics</h2>
            {analyticsRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
                No data yet. Views and enquiries will show up here once buyers start browsing.
              </p>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-4 py-2.5 font-medium">Views</th>
                      <th className="px-4 py-2.5 font-medium">Enquiries</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {analyticsRows.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-2.5">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-neutral-500">{p.code}</p>
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">{p.viewCount}</td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {enquiryCountByProduct.get(p.id) ?? 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <h2 className="mb-4 mt-14 text-lg font-semibold">Enquiries received</h2>
            {myEnquiries.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
                No enquiries yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                {myEnquiries.map((e) => (
                  <div key={e.id} className="flex items-start justify-between gap-4 p-4">
                    <div>
                      {e.message && <p className="text-sm">{e.message}</p>}
                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(e.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <form action={updateEnquiryStatus} className="flex items-center gap-2">
                      <input type="hidden" name="enquiryId" value={e.id} />
                      <select
                        name="status"
                        defaultValue={e.status}
                        className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                      >
                        <option value="new">New</option>
                        <option value="responded">Responded</option>
                        <option value="closed">Closed</option>
                      </select>
                      <button
                        type="submit"
                        className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                      >
                        Save
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="h-fit rounded-xl border border-neutral-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold">Add a product</h2>
            <form action={createProduct} className="flex flex-col gap-3">
              <input
                name="name"
                required
                placeholder="Product name"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="code"
                placeholder="Product code"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="collection"
                placeholder="Collection"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="category"
                placeholder="Category"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="woodSpecie"
                placeholder="Wood specie / material"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="finish"
                placeholder="Finish"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="panelSizes"
                placeholder="Panel sizes (comma separated)"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                type="file"
                name="image"
                accept="image/*"
                className="text-xs"
              />
              <button
                type="submit"
                className="mt-1 rounded-lg bg-terracotta-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Add product
              </button>
            </form>
          </aside>
        </div>
      </main>
    </div>
  );
}
