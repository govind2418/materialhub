import Link from "next/link";
import { notFound } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admin";
import { enquiryTypeLabel } from "@/lib/enquiry-labels";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { EnquiryDetails } from "@/components/enquiry-details";
import {
  activatePremiumMembership,
  approveEditRequest,
  createGuide,
  deleteGuide,
  deleteProjectReferenceAdmin,
  rejectEditRequest,
  rejectPremiumMembership,
  toggleGuidePublished,
  togglePaidStatus,
} from "./actions";

const FIELD_LABEL: Record<string, string> = {
  name: "Name",
  code: "Code",
  collection: "Collection",
  category: "Category",
  woodSpecie: "Wood specie",
  finish: "Finish",
  panelSizes: "Panel sizes",
  certifications: "Certifications",
  installationGuideUrl: "Installation guide URL",
  pricePerSheet: "Price per sheet",
  fireRating: "Fire rating",
  moistureResistance: "Moisture resistance",
  maintenanceLevel: "Maintenance level",
};

function formatFieldValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.join(", ") || "—";
  return String(value);
}

const ROLE_LABEL: Record<string, string> = {
  manufacturer: "Manufacturer",
  architect: "Architect",
  distributor: "Distributor",
  retailer: "Retailer",
  sales_rep: "Sales rep",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; type?: string }>;
}) {
  const clerkUser = await currentUser();
  const email = clerkUser?.emailAddresses[0]?.emailAddress;
  if (!isAdminEmail(email)) notFound();

  const { role: roleFilter, type: typeFilter } = await searchParams;

  const [
    allUsers,
    allManufacturers,
    allProducts,
    allEnquiries,
    allEnquiryItems,
    allProjects,
    allInventory,
    pendingEditRequests,
  ] = await Promise.all([
    db.query.users.findMany({ orderBy: (u, { desc }) => desc(u.createdAt) }),
    db.query.manufacturers.findMany(),
    db.query.products.findMany(),
    db.query.enquiries.findMany({ orderBy: (e, { desc }) => desc(e.createdAt) }),
    db.query.enquiryItems.findMany(),
    db.query.projects.findMany(),
    db.query.distributorInventory.findMany(),
    db.query.productEditRequests.findMany({
      where: (r, { eq }) => eq(r.status, "pending"),
      orderBy: (r, { desc }) => desc(r.createdAt),
    }),
  ]);

  const [allProjectReferences, allReferenceProductLinks] = await Promise.all([
    db.query.projectReferences.findMany({ orderBy: (r, { desc }) => desc(r.createdAt) }),
    db.query.projectReferenceProducts.findMany(),
  ]);
  const referenceProductCountAdmin = new Map<string, number>();
  for (const link of allReferenceProductLinks) {
    referenceProductCountAdmin.set(
      link.projectReferenceId,
      (referenceProductCountAdmin.get(link.projectReferenceId) ?? 0) + 1
    );
  }

  const allGuides = await db.query.guides.findMany({ orderBy: (g, { desc }) => desc(g.createdAt) });

  const pendingMemberships = await db.query.premiumMemberships.findMany({
    where: (m, { eq }) => eq(m.status, "pending"),
    orderBy: (m, { asc }) => asc(m.requestedAt),
  });
  const activeMemberships = await db.query.premiumMemberships.findMany({
    where: (m, { eq }) => eq(m.status, "active"),
    orderBy: (m, { desc }) => desc(m.activatedAt),
  });
  const activeMembershipCount = activeMemberships.filter(
    (m) => m.expiresAt && new Date(m.expiresAt) > new Date()
  ).length;

  const productsById = new Map(allProducts.map((p) => [p.id, p]));
  const manufacturersById = new Map(allManufacturers.map((m) => [m.id, m]));
  const usersById = new Map(allUsers.map((u) => [u.id, u]));

  // enquiry -> line item value
  const valueByEnquiryId = new Map<string, number>();
  for (const item of allEnquiryItems) {
    const product = productsById.get(item.productId);
    if (!product?.pricePerSheet) continue;
    const line = product.pricePerSheet * (item.quantity ?? 1);
    valueByEnquiryId.set(item.enquiryId, (valueByEnquiryId.get(item.enquiryId) ?? 0) + line);
  }

  // per-user activity maps
  const projectCountByUser = new Map<string, number>();
  for (const p of allProjects) {
    projectCountByUser.set(p.architectUserId, (projectCountByUser.get(p.architectUserId) ?? 0) + 1);
  }
  const enquiriesSentByUser = new Map<string, number>();
  const enquiriesReceivedByManufacturer = new Map<string, number>();
  for (const e of allEnquiries) {
    enquiriesSentByUser.set(e.architectUserId, (enquiriesSentByUser.get(e.architectUserId) ?? 0) + 1);
    enquiriesReceivedByManufacturer.set(
      e.manufacturerId,
      (enquiriesReceivedByManufacturer.get(e.manufacturerId) ?? 0) + 1
    );
  }
  const manufacturerByOwner = new Map(
    allManufacturers.filter((m) => m.ownerUserId).map((m) => [m.ownerUserId!, m])
  );
  const productCountByManufacturer = new Map<string, number>();
  const verifiedCountByManufacturer = new Map<string, number>();
  for (const p of allProducts) {
    productCountByManufacturer.set(p.manufacturerId, (productCountByManufacturer.get(p.manufacturerId) ?? 0) + 1);
    if (p.verificationStatus !== "pending") {
      verifiedCountByManufacturer.set(
        p.manufacturerId,
        (verifiedCountByManufacturer.get(p.manufacturerId) ?? 0) + 1
      );
    }
  }
  const inventoryCountByUser = new Map<string, number>();
  for (const i of allInventory) {
    inventoryCountByUser.set(i.distributorUserId, (inventoryCountByUser.get(i.distributorUserId) ?? 0) + 1);
  }
  const assignedLeadsByUser = new Map<string, number>();
  for (const e of allEnquiries) {
    if (!e.assignedSalesRepUserId) continue;
    assignedLeadsByUser.set(
      e.assignedSalesRepUserId,
      (assignedLeadsByUser.get(e.assignedSalesRepUserId) ?? 0) + 1
    );
  }

  const usersByRole: Record<string, number> = {};
  for (const u of allUsers) usersByRole[u.role] = (usersByRole[u.role] ?? 0) + 1;

  const verifiedProductsCount = allProducts.filter((p) => p.verificationStatus !== "pending").length;

  const enquiriesByType: Record<string, number> = {};
  for (const e of allEnquiries) enquiriesByType[e.type] = (enquiriesByType[e.type] ?? 0) + 1;

  const orderEnquiries = allEnquiries.filter((e) => e.type === "order");
  const totalOrderValue = orderEnquiries.reduce((sum, e) => sum + (valueByEnquiryId.get(e.id) ?? 0), 0);
  const paidCount = allEnquiries.filter((e) => e.paidStatus === "paid").length;
  const unpaidCount = allEnquiries.length - paidCount;

  const filteredUsers = roleFilter ? allUsers.filter((u) => u.role === roleFilter) : allUsers;
  const filteredEnquiries = typeFilter ? allEnquiries.filter((e) => e.type === typeFilter) : allEnquiries;

  const roles = ["manufacturer", "architect", "distributor", "retailer", "sales_rep"];
  const enquiryTypes = ["sample_request", "rfq", "order", "restock", "general_enquiry"];

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Owner panel</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Full platform visibility — every user, order, and enquiry. Only visible to
          allowlisted emails.
        </p>

        {/* Stats */}
        <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total users" value={allUsers.length} />
          {roles.map((r) => (
            <StatCard key={r} label={ROLE_LABEL[r]} value={usersByRole[r] ?? 0} />
          ))}
          <StatCard label="Manufacturers" value={allManufacturers.length} />
          <StatCard label="Products" value={allProducts.length} />
          <StatCard label="Verified products" value={verifiedProductsCount} />
          <StatCard label="Total enquiries" value={allEnquiries.length} />
          <StatCard label="Orders placed" value={enquiriesByType.order ?? 0} />
          <StatCard label="Order value (₹)" value={totalOrderValue.toLocaleString("en-IN")} accent />
          <StatCard label="Paid" value={paidCount} tone="green" />
          <StatCard label="Unpaid" value={unpaidCount} tone="amber" />
        </div>

        {/* Users */}
        <section className="mt-14">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">All users ({filteredUsers.length})</h2>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterPill label="All" active={!roleFilter} href="/admin" />
            {roles.map((r) => (
              <FilterPill
                key={r}
                label={ROLE_LABEL[r]}
                active={roleFilter === r}
                href={`/admin?role=${r}`}
              />
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                  <th className="px-4 py-2.5 font-medium">Name</th>
                  <th className="px-4 py-2.5 font-medium">Email</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Company</th>
                  <th className="px-4 py-2.5 font-medium">City</th>
                  <th className="px-4 py-2.5 font-medium">Activity</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                {filteredUsers.map((u) => {
                  let activity = "—";
                  if (u.role === "architect") {
                    activity = `${projectCountByUser.get(u.id) ?? 0} projects · ${enquiriesSentByUser.get(u.id) ?? 0} enquiries sent`;
                  } else if (u.role === "manufacturer") {
                    const mfr = manufacturerByOwner.get(u.id);
                    if (mfr) {
                      activity = `${productCountByManufacturer.get(mfr.id) ?? 0} products (${verifiedCountByManufacturer.get(mfr.id) ?? 0} verified) · ${enquiriesReceivedByManufacturer.get(mfr.id) ?? 0} enquiries received`;
                    }
                  } else if (u.role === "sales_rep") {
                    activity = `${assignedLeadsByUser.get(u.id) ?? 0} leads assigned`;
                  } else if (u.role === "distributor") {
                    activity = `${inventoryCountByUser.get(u.id) ?? 0} products in inventory`;
                  } else if (u.role === "retailer") {
                    activity = `${enquiriesSentByUser.get(u.id) ?? 0} restock requests`;
                  }

                  return (
                    <tr key={u.id}>
                      <td className="px-4 py-3 font-medium text-neutral-900">{u.name}</td>
                      <td className="px-4 py-3 text-neutral-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{u.companyName ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{u.city ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{activity}</td>
                      <td className="px-4 py-3 text-neutral-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Orders & enquiries */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            All orders &amp; enquiries ({filteredEnquiries.length})
          </h2>
          <div className="mb-4 flex flex-wrap gap-2">
            <FilterPill label="All" active={!typeFilter} href="/admin" />
            {enquiryTypes.map((t) => (
              <FilterPill
                key={t}
                label={enquiryTypeLabel(t)}
                active={typeFilter === t}
                href={`/admin?type=${t}`}
              />
            ))}
          </div>

          {filteredEnquiries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
              No orders or enquiries yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {filteredEnquiries.map((e) => {
                const value = valueByEnquiryId.get(e.id) ?? 0;
                const architect = usersById.get(e.architectUserId);
                const manufacturer = manufacturersById.get(e.manufacturerId);
                return (
                  <details key={e.id} className="p-4">
                    <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">
                          {architect?.name ?? "Unknown user"}{" "}
                          <span className="text-neutral-400">→</span> {manufacturer?.name ?? "Unknown manufacturer"}
                          <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                            {enquiryTypeLabel(e.type)}
                          </span>
                        </p>
                        <p className="mt-1 text-xs text-neutral-400">
                          {new Date(e.createdAt).toLocaleString()} · Status: {e.status}
                          {e.sampleStatus && ` · Sample: ${e.sampleStatus}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {value > 0 && (
                          <span className="text-sm font-semibold">₹{value.toLocaleString("en-IN")}</span>
                        )}
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                            e.paidStatus === "paid"
                              ? "bg-green-50 text-green-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                        >
                          {e.paidStatus === "paid" ? "Paid" : "Unpaid"}
                        </span>
                      </div>
                    </summary>
                    <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                      {e.message && <p className="mb-2 text-sm text-neutral-600">{e.message}</p>}
                      <EnquiryDetails enquiryId={e.id} />
                      <form action={togglePaidStatus} className="mt-3">
                        <input type="hidden" name="enquiryId" value={e.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-terracotta-400 hover:text-terracotta-600"
                        >
                          Mark as {e.paidStatus === "paid" ? "unpaid" : "paid"}
                        </button>
                      </form>
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>

        {/* Product edit requests */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            Pending product edit requests ({pendingEditRequests.length})
          </h2>
          {pendingEditRequests.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No edits awaiting review. Edits to already-verified products land here.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {pendingEditRequests.map((r) => {
                const product = productsById.get(r.productId);
                const manufacturer = product ? manufacturersById.get(product.manufacturerId) : null;
                const changes = Object.entries(r.proposedChanges);
                return (
                  <div key={r.id} className="p-4">
                    <p className="text-sm font-medium">
                      {product?.name ?? "Unknown product"}{" "}
                      <span className="text-neutral-400">·</span> {manufacturer?.name ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-neutral-400">
                      Requested {new Date(r.createdAt).toLocaleString()}
                    </p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-neutral-200">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 bg-neutral-50 uppercase tracking-wide text-neutral-500">
                            <th className="px-3 py-2 font-medium">Field</th>
                            <th className="px-3 py-2 font-medium">Current</th>
                            <th className="px-3 py-2 font-medium">Proposed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {changes.map(([field, value]) => (
                            <tr key={field}>
                              <td className="px-3 py-2 font-medium text-neutral-700">
                                {FIELD_LABEL[field] ?? field}
                              </td>
                              <td className="px-3 py-2 text-neutral-500">
                                {formatFieldValue(product ? (product as Record<string, unknown>)[field] : undefined)}
                              </td>
                              <td className="px-3 py-2 font-medium text-terracotta-700">
                                {formatFieldValue(value)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <form action={approveEditRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          Approve
                        </button>
                      </form>
                      <form action={rejectEditRequest}>
                        <input type="hidden" name="requestId" value={r.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-red-300 hover:text-red-600"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Project references */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            Project references ({allProjectReferences.length})
          </h2>
          {allProjectReferences.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No curated case studies yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {allProjectReferences.map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-neutral-500">
                      {r.createdByManufacturerId
                        ? manufacturersById.get(r.createdByManufacturerId)?.name ?? "Unknown manufacturer"
                        : "—"}{" "}
                      · {referenceProductCountAdmin.get(r.id) ?? 0} product
                      {(referenceProductCountAdmin.get(r.id) ?? 0) === 1 ? "" : "s"} tagged
                      {r.category && ` · ${r.category}`}
                    </p>
                  </div>
                  <form action={deleteProjectReferenceAdmin}>
                    <input type="hidden" name="referenceId" value={r.id} />
                    <button className="text-xs text-neutral-400 hover:text-red-600">Delete</button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Guides / Material Knowledge Centre */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Guides ({allGuides.length})</h2>
          <p className="mb-4 text-xs text-neutral-500">
            Powers the public /learn section. Only published guides are visible there.
          </p>
          {allGuides.length === 0 ? (
            <p className="mb-4 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No guides yet.
            </p>
          ) : (
            <div className="mb-4 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {allGuides.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-4 p-4">
                  <div>
                    <p className="text-sm font-medium">{g.title}</p>
                    <p className="text-xs text-neutral-500">
                      {g.category ?? "Uncategorized"} · {new Date(g.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        g.published ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"
                      }`}
                    >
                      {g.published ? "Published" : "Draft"}
                    </span>
                    <form action={toggleGuidePublished}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button className="text-xs text-neutral-400 hover:text-terracotta-600">
                        {g.published ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <form action={deleteGuide}>
                      <input type="hidden" name="guideId" value={g.id} />
                      <button className="text-xs text-neutral-400 hover:text-red-600">Delete</button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form action={createGuide} className="flex flex-col gap-2 rounded-xl border border-neutral-200 bg-white p-4">
            <input
              name="title"
              required
              placeholder="Guide title (e.g. Veneer vs laminate)"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              name="summary"
              placeholder="One-line summary"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <input
              name="category"
              placeholder="Category (optional, e.g. Material basics)"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <textarea
              name="content"
              required
              rows={6}
              placeholder="Full article content"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="published" className="h-4 w-4" />
              Publish immediately
            </label>
            <button
              type="submit"
              className="mt-1 self-start rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
            >
              Add guide
            </button>
          </form>
        </section>

        {/* Architect Circle — active premium members */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            ✦ Architect Circle — premium members ({activeMembershipCount})
          </h2>
          {activeMemberships.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No premium members yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-amber-200 bg-white">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead>
                  <tr className="border-b border-amber-200 bg-amber-50 text-xs uppercase tracking-wide text-amber-800">
                    <th className="px-4 py-2.5 font-medium">Architect</th>
                    <th className="px-4 py-2.5 font-medium">Email</th>
                    <th className="px-4 py-2.5 font-medium">Activated</th>
                    <th className="px-4 py-2.5 font-medium">Expires</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {activeMemberships.map((m) => {
                    const member = usersById.get(m.userId);
                    const stillValid = m.expiresAt && new Date(m.expiresAt) > new Date();
                    const daysLeft = m.expiresAt
                      ? Math.ceil((new Date(m.expiresAt).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    return (
                      <tr key={m.id}>
                        <td className="px-4 py-3 font-medium text-neutral-900">{member?.name ?? "Unknown"}</td>
                        <td className="px-4 py-3 text-neutral-600">{member?.email}</td>
                        <td className="px-4 py-3 text-neutral-600">
                          {m.activatedAt ? new Date(m.activatedAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3 text-neutral-600">
                          {m.expiresAt ? new Date(m.expiresAt).toLocaleDateString() : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              stillValid ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                            }`}
                          >
                            {stillValid ? `Active · ${daysLeft}d left` : "Expired"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Architect Circle — pending requests */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">
            Architect Circle — pending requests ({pendingMemberships.length})
          </h2>
          {pendingMemberships.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No pending membership requests.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {pendingMemberships.map((m) => {
                const requester = usersById.get(m.userId);
                return (
                  <div key={m.id} className="flex items-center justify-between gap-4 p-4">
                    <div>
                      <p className="text-sm font-medium">{requester?.name ?? "Unknown architect"}</p>
                      <p className="text-xs text-neutral-500">
                        {requester?.email} · ₹{m.amount.toLocaleString("en-IN")} · requested{" "}
                        {new Date(m.requestedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <form action={activatePremiumMembership}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-green-300 bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-100"
                        >
                          Activate (30 days)
                        </button>
                      </form>
                      <form action={rejectPremiumMembership}>
                        <input type="hidden" name="membershipId" value={m.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:border-red-300 hover:text-red-600"
                        >
                          Reject
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Manufacturers */}
        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Manufacturers ({allManufacturers.length})</h2>
          {allManufacturers.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No manufacturers yet.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-white">
              <table className="w-full min-w-[600px] text-left text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
                    <th className="px-4 py-2.5 font-medium">Name</th>
                    <th className="px-4 py-2.5 font-medium">Owner</th>
                    <th className="px-4 py-2.5 font-medium">City</th>
                    <th className="px-4 py-2.5 font-medium">Products</th>
                    <th className="px-4 py-2.5 font-medium">Verified</th>
                    <th className="px-4 py-2.5 font-medium">Enquiries received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {allManufacturers.map((m) => (
                    <tr key={m.id}>
                      <td className="px-4 py-3 font-medium text-neutral-900">{m.name}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {m.ownerUserId ? usersById.get(m.ownerUserId)?.email ?? "—" : "Seed data (no owner)"}
                      </td>
                      <td className="px-4 py-3 text-neutral-600">{m.city ?? "—"}</td>
                      <td className="px-4 py-3 text-neutral-600">{productCountByManufacturer.get(m.id) ?? 0}</td>
                      <td className="px-4 py-3 text-neutral-600">{verifiedCountByManufacturer.get(m.id) ?? 0}</td>
                      <td className="px-4 py-3 text-neutral-600">
                        {enquiriesReceivedByManufacturer.get(m.id) ?? 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  accent,
  tone,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
  tone?: "green" | "amber";
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">{label}</p>
      <p
        className={`mt-1 text-xl font-semibold ${
          tone === "green"
            ? "text-green-700"
            : tone === "amber"
              ? "text-amber-700"
              : accent
                ? "text-terracotta-600"
                : "text-neutral-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function FilterPill({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-terracotta-500 bg-terracotta-500 text-white"
          : "border-neutral-300 bg-white text-neutral-700 hover:border-terracotta-300 hover:text-terracotta-600"
      }`}
    >
      {label}
    </Link>
  );
}
