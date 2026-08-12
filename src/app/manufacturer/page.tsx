import Image from "next/image";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { enquiryTypeLabel } from "@/lib/enquiry-labels";
import { SiteHeader } from "@/components/site-header";
import { EnquiryDetails } from "@/components/enquiry-details";
import {
  assignDistributor,
  assignLead,
  createProduct,
  deleteProduct,
  inviteTeamMember,
  linkRelatedProduct,
  markLeadContacted,
  removeTeamMember,
  toggleProductVerification,
  updateEnquiryStatus,
  updateSampleStatus,
} from "./actions";

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

  const distributorUsers = await db.query.users.findMany({
    where: (u, { eq }) => eq(u.role, "distributor"),
  });

  const productIds = myProducts.map((p) => p.id);
  const relatedLinks = productIds.length
    ? await db.query.relatedProducts.findMany({
        where: (r, { inArray }) => inArray(r.productId, productIds),
      })
    : [];
  const distributorLinks = productIds.length
    ? await db.query.productDistributors.findMany({
        where: (d, { inArray }) => inArray(d.productId, productIds),
      })
    : [];
  const productsById = new Map(myProducts.map((p) => [p.id, p]));
  const distributorUsersById = new Map(distributorUsers.map((u) => [u.id, u]));

  const teamMembers = manufacturer
    ? await db.query.manufacturerTeamMembers.findMany({
        where: (m, { eq }) => eq(m.manufacturerId, manufacturer.id),
        orderBy: (m, { desc }) => desc(m.createdAt),
      })
    : [];

  const activeSalesReps = teamMembers.filter(
    (m) => m.role === "sales_rep" && m.status === "active" && m.userId
  );
  const salesRepUsers = activeSalesReps.length
    ? await db.query.users.findMany({
        where: (u, { inArray }) =>
          inArray(u.id, activeSalesReps.map((m) => m.userId!)),
      })
    : [];
  const salesRepUsersById = new Map(salesRepUsers.map((u) => [u.id, u]));

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
                {myProducts.map((p) => {
                  const related = relatedLinks
                    .filter((r) => r.productId === p.id)
                    .map((r) => productsById.get(r.relatedProductId))
                    .filter(Boolean);
                  const linkedDistributors = distributorLinks
                    .filter((d) => d.productId === p.id)
                    .map((d) => distributorUsersById.get(d.distributorUserId))
                    .filter(Boolean);
                  const otherProducts = myProducts.filter((o) => o.id !== p.id);

                  return (
                    <div key={p.id} className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
                      <div className="relative aspect-square w-full bg-neutral-100">
                        <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                        {p.verificationStatus !== "pending" && (
                          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-green-700">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm font-medium">{p.name}</p>
                        <p className="truncate text-xs text-neutral-500">{p.code}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <form action={deleteProduct}>
                            <input type="hidden" name="productId" value={p.id} />
                            <button className="text-xs text-neutral-400 hover:text-red-600">
                              Delete
                            </button>
                          </form>
                          <form action={toggleProductVerification}>
                            <input type="hidden" name="productId" value={p.id} />
                            <button className="text-xs text-neutral-400 hover:text-green-700">
                              {p.verificationStatus === "pending" ? "Mark verified" : "Unmark verified"}
                            </button>
                          </form>
                        </div>

                        {related.length > 0 && (
                          <p className="mt-2 text-[11px] text-neutral-500">
                            Related: {related.map((r) => r!.name).join(", ")}
                          </p>
                        )}
                        {linkedDistributors.length > 0 && (
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Distributors: {linkedDistributors.map((d) => d!.name).join(", ")}
                          </p>
                        )}

                        {otherProducts.length > 0 && (
                          <form action={linkRelatedProduct} className="mt-2 flex gap-1">
                            <input type="hidden" name="productId" value={p.id} />
                            <select
                              name="relatedProductId"
                              className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-1 text-[11px]"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Link related...
                              </option>
                              {otherProducts.map((o) => (
                                <option key={o.id} value={o.id}>
                                  {o.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded border border-neutral-300 px-1.5 text-[11px] hover:border-terracotta-400"
                            >
                              +
                            </button>
                          </form>
                        )}

                        {distributorUsers.length > 0 && (
                          <form action={assignDistributor} className="mt-1 flex gap-1">
                            <input type="hidden" name="productId" value={p.id} />
                            <select
                              name="distributorUserId"
                              className="min-w-0 flex-1 rounded border border-neutral-300 px-1 py-1 text-[11px]"
                              defaultValue=""
                            >
                              <option value="" disabled>
                                Assign distributor...
                              </option>
                              {distributorUsers.map((d) => (
                                <option key={d.id} value={d.id}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="submit"
                              className="rounded border border-neutral-300 px-1.5 text-[11px] hover:border-terracotta-400"
                            >
                              +
                            </button>
                          </form>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                  <div key={e.id} className="flex flex-wrap items-start justify-between gap-3 p-4">
                    <div>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                        {enquiryTypeLabel(e.type)}
                      </span>
                      {e.message && <p className="mt-1 text-sm">{e.message}</p>}
                      <p className="mt-1 text-xs text-neutral-400">
                        {new Date(e.createdAt).toLocaleDateString()}
                        {e.assignedSalesRepUserId &&
                          salesRepUsersById.get(e.assignedSalesRepUserId) &&
                          ` · Assigned to ${salesRepUsersById.get(e.assignedSalesRepUserId)!.name}`}
                        {e.lastContactedAt &&
                          ` · Last contacted ${new Date(e.lastContactedAt).toLocaleDateString()}`}
                      </p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-terracotta-600 hover:text-terracotta-700">
                          View details
                        </summary>
                        <div className="mt-2 max-w-md rounded-lg bg-neutral-50 p-3">
                          <EnquiryDetails enquiryId={e.id} />
                        </div>
                      </details>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {salesRepUsers.length > 0 && (
                        <form action={assignLead} className="flex items-center gap-2">
                          <input type="hidden" name="enquiryId" value={e.id} />
                          <select
                            name="salesRepUserId"
                            defaultValue={e.assignedSalesRepUserId ?? ""}
                            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                          >
                            <option value="">Unassigned</option>
                            {salesRepUsers.map((rep) => (
                              <option key={rep.id} value={rep.id}>
                                {rep.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                          >
                            Assign
                          </button>
                        </form>
                      )}
                      <form action={markLeadContacted}>
                        <input type="hidden" name="enquiryId" value={e.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                        >
                          Mark contacted
                        </button>
                      </form>
                      {e.type === "sample_request" && (
                        <form action={updateSampleStatus} className="flex items-center gap-2">
                          <input type="hidden" name="enquiryId" value={e.id} />
                          <select
                            name="sampleStatus"
                            defaultValue={e.sampleStatus ?? "requested"}
                            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium"
                          >
                            <option value="requested">Requested</option>
                            <option value="dispatched">Dispatched</option>
                            <option value="delivered">Delivered</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <button
                            type="submit"
                            className="rounded-full border border-neutral-300 px-2.5 py-1 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                          >
                            Save
                          </button>
                        </form>
                      )}
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
                  </div>
                ))}
              </div>
            )}

            <div className="mb-4 mt-14 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Team</h2>
            </div>
            <form action={inviteTeamMember} className="mb-4 flex flex-wrap gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="Email to invite"
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
              />
              <select
                name="role"
                defaultValue="distributor"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              >
                <option value="distributor">Distributor</option>
                <option value="sales_rep">Sales rep</option>
              </select>
              <button
                type="submit"
                className="rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Invite
              </button>
            </form>
            {teamMembers.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
                No distributors or sales reps linked yet.
              </p>
            ) : (
              <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
                {teamMembers.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium">{m.email}</p>
                      <p className="text-xs text-neutral-500">
                        {m.role === "sales_rep" ? "Sales rep" : "Distributor"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          m.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {m.status === "active" ? "Active" : "Invited"}
                      </span>
                      <form action={removeTeamMember}>
                        <input type="hidden" name="memberId" value={m.id} />
                        <button className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
                      </form>
                    </div>
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
                name="pricePerSheet"
                type="number"
                min="0"
                placeholder="Price per sheet (₹)"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="certifications"
                placeholder="Certifications (comma separated)"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <input
                name="installationGuideUrl"
                type="url"
                placeholder="Installation guide URL"
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
