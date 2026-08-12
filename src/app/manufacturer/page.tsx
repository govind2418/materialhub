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
  submitQuote,
  toggleProductVerification,
  updateEnquiryStatus,
  updateProduct,
  updateSampleStatus,
} from "./actions";

const RELATION_LABEL: Record<string, string> = {
  alternative_to: "Alternative",
  compatible_with: "Compatible",
  used_with: "Used with",
  similar_to: "Similar",
};

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

  const enquiriesById = new Map(myEnquiries.map((e) => [e.id, e]));
  const sampleRequestedByProduct = new Map<string, number>();
  const rfqByProduct = new Map<string, number>();
  const contactedByProduct = new Map<string, number>();
  const quotedByProduct = new Map<string, number>();
  for (const item of enquiryItemsByEnquiry) {
    const enquiry = enquiriesById.get(item.enquiryId);
    if (!enquiry) continue;
    if (enquiry.type === "sample_request") {
      sampleRequestedByProduct.set(item.productId, (sampleRequestedByProduct.get(item.productId) ?? 0) + 1);
    }
    if (enquiry.type === "rfq") {
      rfqByProduct.set(item.productId, (rfqByProduct.get(item.productId) ?? 0) + 1);
    }
    if (enquiry.lastContactedAt) {
      contactedByProduct.set(item.productId, (contactedByProduct.get(item.productId) ?? 0) + 1);
    }
    if (enquiry.quotedPrice != null) {
      quotedByProduct.set(item.productId, (quotedByProduct.get(item.productId) ?? 0) + 1);
    }
  }

  const analyticsRows = [...myProducts]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 10);

  const distributorUsers = await db.query.users.findMany({
    where: (u, { eq }) => eq(u.role, "distributor"),
  });

  const productIds = myProducts.map((p) => p.id);

  const shortlistedItems = productIds.length
    ? await db.query.moodBoardItems.findMany({
        where: (i, { inArray }) => inArray(i.productId, productIds),
      })
    : [];
  const shortlistedByProduct = new Map<string, number>();
  for (const item of shortlistedItems) {
    shortlistedByProduct.set(item.productId, (shortlistedByProduct.get(item.productId) ?? 0) + 1);
  }

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
                    .map((r) => ({ product: productsById.get(r.relatedProductId), relationType: r.relationType }))
                    .filter((r) => r.product);
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
                        {p.needsReview && (
                          <span className="absolute right-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                            Edit pending review
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

                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs font-medium text-terracotta-600 hover:text-terracotta-700">
                            Edit
                          </summary>
                          <form action={updateProduct} className="mt-2 flex flex-col gap-1.5">
                            <input type="hidden" name="productId" value={p.id} />
                            {p.verificationStatus !== "pending" && (
                              <p className="text-[10px] text-neutral-500">
                                This product is verified — changes will be queued for review
                                instead of applying instantly.
                              </p>
                            )}
                            <input
                              name="name"
                              defaultValue={p.name}
                              placeholder="Product name"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="code"
                              defaultValue={p.code ?? ""}
                              placeholder="Product code"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="collection"
                              defaultValue={p.collection ?? ""}
                              placeholder="Collection"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="category"
                              defaultValue={p.category ?? ""}
                              placeholder="Category"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="woodSpecie"
                              defaultValue={p.woodSpecie ?? ""}
                              placeholder="Wood specie / material"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="finish"
                              defaultValue={p.finish ?? ""}
                              placeholder="Finish"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="panelSizes"
                              defaultValue={p.panelSizes?.join(", ") ?? ""}
                              placeholder="Panel sizes (comma separated)"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="pricePerSheet"
                              type="number"
                              min="0"
                              defaultValue={p.pricePerSheet ?? ""}
                              placeholder="Price per sheet (₹)"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="certifications"
                              defaultValue={p.certifications?.join(", ") ?? ""}
                              placeholder="Certifications (comma separated)"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="installationGuideUrl"
                              type="url"
                              defaultValue={p.installationGuideUrl ?? ""}
                              placeholder="Installation guide URL"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <input
                              name="fireRating"
                              defaultValue={p.fireRating ?? ""}
                              placeholder="Fire rating"
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px]"
                            />
                            <select
                              name="moistureResistance"
                              defaultValue={p.moistureResistance ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700"
                            >
                              <option value="">Moisture resistance — not set</option>
                              <option value="Low">Low</option>
                              <option value="Standard">Standard</option>
                              <option value="High">High</option>
                            </select>
                            <select
                              name="maintenanceLevel"
                              defaultValue={p.maintenanceLevel ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-[11px] text-neutral-700"
                            >
                              <option value="">Maintenance level — not set</option>
                              <option value="Low">Low</option>
                              <option value="Medium">Medium</option>
                              <option value="High">High</option>
                            </select>
                            <button
                              type="submit"
                              className="mt-1 rounded border border-neutral-300 px-2 py-1 text-[11px] font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                            >
                              Save changes
                            </button>
                          </form>
                        </details>

                        {related.length > 0 && (
                          <p className="mt-2 text-[11px] text-neutral-500">
                            {related
                              .map((r) => `${r.product!.name} (${RELATION_LABEL[r.relationType]})`)
                              .join(", ")}
                          </p>
                        )}
                        {linkedDistributors.length > 0 && (
                          <p className="mt-1 text-[11px] text-neutral-500">
                            Distributors: {linkedDistributors.map((d) => d!.name).join(", ")}
                          </p>
                        )}

                        {otherProducts.length > 0 && (
                          <form action={linkRelatedProduct} className="mt-2 flex flex-wrap gap-1">
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
                            <select
                              name="relationType"
                              defaultValue="alternative_to"
                              className="rounded border border-neutral-300 px-1 py-1 text-[11px]"
                            >
                              {Object.entries(RELATION_LABEL).map(([value, label]) => (
                                <option key={value} value={value}>
                                  {label}
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

            <h2 className="mb-4 mt-14 text-lg font-semibold">Lead funnel</h2>
            {analyticsRows.length === 0 ? (
              <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
                No data yet. Views and enquiries will show up here once buyers start browsing.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-4 py-2.5 font-medium">Product</th>
                      <th className="px-4 py-2.5 font-medium">Viewed</th>
                      <th className="px-4 py-2.5 font-medium">Shortlisted</th>
                      <th className="px-4 py-2.5 font-medium">Sample req&apos;d</th>
                      <th className="px-4 py-2.5 font-medium">RFQ&apos;d</th>
                      <th className="px-4 py-2.5 font-medium">Contacted</th>
                      <th className="px-4 py-2.5 font-medium">Quoted</th>
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
                          {shortlistedByProduct.get(p.id) ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {sampleRequestedByProduct.get(p.id) ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {rfqByProduct.get(p.id) ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {contactedByProduct.get(p.id) ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-neutral-700">
                          {quotedByProduct.get(p.id) ?? 0}
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
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-medium text-terracotta-600 hover:text-terracotta-700">
                          {e.quotedPrice ? "Update quote" : "Send quote"}
                        </summary>
                        <form
                          action={submitQuote}
                          className="mt-2 grid max-w-md grid-cols-2 gap-2 rounded-lg bg-neutral-50 p-3"
                        >
                          <input type="hidden" name="enquiryId" value={e.id} />
                          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                            Price (₹)
                            <input
                              name="quotedPrice"
                              type="number"
                              min="0"
                              defaultValue={e.quotedPrice ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                            Delivery (days)
                            <input
                              name="quotedDeliveryDays"
                              type="number"
                              min="0"
                              defaultValue={e.quotedDeliveryDays ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                            Freight (₹)
                            <input
                              name="freightCost"
                              type="number"
                              min="0"
                              defaultValue={e.freightCost ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-[11px] text-neutral-500">
                            Valid until
                            <input
                              name="validUntil"
                              type="date"
                              defaultValue={e.validUntil ? new Date(e.validUntil).toISOString().slice(0, 10) : ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            />
                          </label>
                          <label className="col-span-2 flex flex-col gap-1 text-[11px] text-neutral-500">
                            Payment terms
                            <input
                              name="paymentTerms"
                              placeholder="e.g. 50% advance, balance on delivery"
                              defaultValue={e.paymentTerms ?? ""}
                              className="rounded border border-neutral-300 px-2 py-1 text-xs"
                            />
                          </label>
                          <button
                            type="submit"
                            className="col-span-2 mt-1 rounded border border-neutral-300 px-2 py-1.5 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                          >
                            Save quote
                          </button>
                        </form>
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
                name="fireRating"
                placeholder="Fire rating (e.g. Class B, Fire retardant)"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <select
                name="moistureResistance"
                defaultValue=""
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
              >
                <option value="">Moisture resistance — not set</option>
                <option value="Low">Low moisture resistance</option>
                <option value="Standard">Standard moisture resistance</option>
                <option value="High">High moisture resistance</option>
              </select>
              <select
                name="maintenanceLevel"
                defaultValue=""
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-700"
              >
                <option value="">Maintenance level — not set</option>
                <option value="Low">Low maintenance</option>
                <option value="Medium">Medium maintenance</option>
                <option value="High">High maintenance</option>
              </select>
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
