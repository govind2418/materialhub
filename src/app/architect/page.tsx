import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentDbUser } from "@/lib/current-user";
import { enquiryTypeLabel } from "@/lib/enquiry-labels";
import { SiteHeader } from "@/components/site-header";
import { EnquiryDetails } from "@/components/enquiry-details";
import { createProject, generateShareLink, removeFromMoodBoard, sendBoardEnquiry } from "./actions";
import { generateRfq } from "./rfq-actions";
import { uploadBoq } from "./boq-actions";
import { updateProfileSettings, toggleProjectPublic } from "./profile-actions";

export default async function ArchitectDashboard() {
  const user = await getCurrentDbUser();
  if (!user) redirect("/onboarding");
  if (user.role !== "architect") redirect("/manufacturer");

  const myProjects = await db.query.projects.findMany({
    where: (p, { eq }) => eq(p.architectUserId, user.id),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });

  const manufacturersById = new Map(
    (await db.query.manufacturers.findMany()).map((m) => [m.id, m])
  );

  const myEnquiries = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.architectUserId, user.id),
    orderBy: (e, { desc }) => desc(e.createdAt),
  });

  const rfqGroups = new Map<string, typeof myEnquiries>();
  const standaloneEnquiries: typeof myEnquiries = [];
  for (const e of myEnquiries) {
    if ((e.type === "rfq" || e.type === "order") && e.rfqId) {
      const list = rfqGroups.get(e.rfqId) ?? [];
      list.push(e);
      rfqGroups.set(e.rfqId, list);
    } else {
      standaloneEnquiries.push(e);
    }
  }

  const projectSections = await Promise.all(
    myProjects.map(async (project) => {
      const board = await db.query.moodBoards.findFirst({
        where: (b, { eq }) => eq(b.projectId, project.id),
      });

      const items = board
        ? await db.query.moodBoardItems.findMany({
            where: (i, { eq }) => eq(i.moodBoardId, board.id),
            orderBy: (i, { desc }) => desc(i.createdAt),
          })
        : [];

      const products = await Promise.all(
        items.map((i) =>
          db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) })
        )
      );

      const groupsByManufacturer = new Map<
        string,
        { item: (typeof items)[number]; product: NonNullable<(typeof products)[number]> }[]
      >();
      items.forEach((item, idx) => {
        const product = products[idx];
        if (!product) return;
        const list = groupsByManufacturer.get(product.manufacturerId) ?? [];
        list.push({ item, product });
        groupsByManufacturer.set(product.manufacturerId, list);
      });

      const validProducts = products.filter((p): p is NonNullable<typeof p> => !!p);
      const listTotal = validProducts.reduce((sum, p) => sum + (p.pricePerSheet ?? 0), 0);

      const quotedEnquiries = board
        ? await db.query.enquiries.findMany({
            where: (e, { and, eq, isNotNull }) => and(eq(e.moodBoardId, board.id), isNotNull(e.quotedPrice)),
          })
        : [];
      const quotedTotal = quotedEnquiries.length > 0
        ? quotedEnquiries.reduce((sum, e) => sum + (e.quotedPrice ?? 0), 0)
        : null;

      const effectiveTotal = quotedTotal ?? listTotal;
      const isOverBudget = project.budget != null && effectiveTotal > project.budget;

      let cheaperAlternatives: { forProduct: string; alternatives: { name: string; slug: string; pricePerSheet: number }[] }[] = [];
      if (isOverBudget) {
        const pricedItems = validProducts
          .filter((p) => p.pricePerSheet != null)
          .sort((a, b) => (b.pricePerSheet ?? 0) - (a.pricePerSheet ?? 0))
          .slice(0, 3);

        cheaperAlternatives = await Promise.all(
          pricedItems.map(async (p) => {
            const cheaperInCategory = p.category
              ? await db.query.products.findMany({
                  where: (alt, { and, eq, lt }) =>
                    and(eq(alt.category, p.category!), lt(alt.pricePerSheet, p.pricePerSheet!)),
                  orderBy: (alt, { asc }) => asc(alt.pricePerSheet),
                  limit: 2,
                })
              : [];
            return {
              forProduct: p.name,
              alternatives: cheaperInCategory
                .filter((a) => a.pricePerSheet != null)
                .map((a) => ({ name: a.name, slug: a.slug, pricePerSheet: a.pricePerSheet! })),
            };
          })
        );
        cheaperAlternatives = cheaperAlternatives.filter((c) => c.alternatives.length > 0);
      }

      return {
        project,
        board,
        groupsByManufacturer,
        totalItems: items.length,
        listTotal,
        quotedTotal,
        isOverBudget,
        cheaperAlternatives,
      };
    })
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Welcome, {user.name}</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Your projects, shortlists, and enquiries.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Link href="/catalog" className="text-sm font-medium text-terracotta-600 hover:text-terracotta-700">
              Browse catalog →
            </Link>
            <Link
              href="/architect/decision-assistant"
              className="text-sm font-medium text-neutral-500 hover:text-terracotta-600"
            >
              Not sure what to pick? Try the decision assistant →
            </Link>
          </div>
        </div>

        <details className="mt-4 rounded-xl border border-neutral-200 bg-white">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-neutral-700 hover:text-terracotta-600">
            Public profile {user.publicProfileEnabled ? "(live)" : "(off)"}
          </summary>
          <div className="border-t border-neutral-200 p-4">
            <form action={updateProfileSettings} className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="publicProfileEnabled"
                  defaultChecked={user.publicProfileEnabled}
                  className="h-4 w-4"
                />
                <span className="text-neutral-700">
                  Make my profile public (portfolio, material preferences — opt-in, nothing
                  shows until you enable this and mark projects below)
                </span>
              </label>
              <textarea
                name="bio"
                rows={2}
                defaultValue={user.bio ?? ""}
                placeholder="Short bio for your public profile"
                className="rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="self-start rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Save
              </button>
              {user.publicProfileEnabled && user.publicSlug && (
                <p className="text-xs text-neutral-500">
                  Live at{" "}
                  <Link href={`/architects/${user.publicSlug}`} className="text-terracotta-600 underline">
                    /architects/{user.publicSlug}
                  </Link>
                  . Mark individual projects &ldquo;Show in public portfolio&rdquo; below to include
                  them.
                </p>
              )}
            </form>
          </div>
        </details>

        <form action={createProject} className="mt-8 flex gap-2">
          <input
            name="name"
            required
            placeholder="New project name"
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
          />
          <input
            name="city"
            placeholder="Project city (optional)"
            className="w-48 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
          />
          <input
            name="budget"
            type="number"
            min="0"
            placeholder="Budget (₹, optional)"
            className="w-44 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
          >
            New project
          </button>
        </form>

        <form action={uploadBoq} className="mt-3 flex items-center gap-2">
          <input
            type="file"
            name="file"
            accept=".csv,.xlsx,.xls"
            required
            className="flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs"
          />
          <button
            type="submit"
            className="rounded-lg border border-terracotta-500 px-4 py-2 text-sm font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
          >
            Upload BOQ (CSV/XLSX)
          </button>
        </form>

        {projectSections.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
            No projects yet. Create one above, or add a product to your mood board from the
            catalog to start one automatically.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {projectSections.map(
              ({
                project,
                board,
                groupsByManufacturer,
                totalItems,
                listTotal,
                quotedTotal,
                isOverBudget,
                cheaperAlternatives,
              }) => (
              <section key={project.id} className="rounded-xl border border-neutral-200 bg-neutral-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {project.name}
                      {project.city && (
                        <span className="ml-2 text-xs font-normal text-neutral-500">{project.city}</span>
                      )}
                    </h2>
                    {totalItems > 0 && (
                      <p className="mt-1 text-xs text-neutral-500">
                        Estimated cost: ₹{listTotal.toLocaleString("en-IN")}
                        {quotedTotal != null && ` · Quoted: ₹${quotedTotal.toLocaleString("en-IN")}`}
                        {project.budget != null && (
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              isOverBudget ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"
                            }`}
                          >
                            {isOverBudget
                              ? `Over budget by ₹${((quotedTotal ?? listTotal) - project.budget).toLocaleString("en-IN")}`
                              : "Under budget"}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-neutral-500">{totalItems} product{totalItems === 1 ? "" : "s"}</span>
                    <Link
                      href={`/catalog?project=${project.id}`}
                      className="rounded-full bg-terracotta-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-terracotta-600"
                    >
                      + Add products
                    </Link>
                    {board && totalItems > 0 && (
                      <form action={generateRfq}>
                        <input type="hidden" name="moodBoardId" value={board.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-terracotta-500 px-3 py-1.5 text-xs font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
                        >
                          Generate RFQ
                        </button>
                      </form>
                    )}
                    {project.shareToken ? (
                      <Link
                        href={`/share/${project.shareToken}`}
                        target="_blank"
                        className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-terracotta-400 hover:text-terracotta-600"
                      >
                        Client approval link ↗
                      </Link>
                    ) : (
                      <form action={generateShareLink}>
                        <input type="hidden" name="projectId" value={project.id} />
                        <button
                          type="submit"
                          className="rounded-full border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:border-terracotta-400 hover:text-terracotta-600"
                        >
                          Get client approval link
                        </button>
                      </form>
                    )}
                    <form action={toggleProjectPublic}>
                      <input type="hidden" name="projectId" value={project.id} />
                      <button
                        type="submit"
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                          project.isPublicPortfolio
                            ? "border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                            : "border-neutral-300 text-neutral-600 hover:border-terracotta-400 hover:text-terracotta-600"
                        }`}
                      >
                        {project.isPublicPortfolio ? "✓ In public portfolio" : "Show in public portfolio"}
                      </button>
                    </form>
                  </div>
                </div>

                {groupsByManufacturer.size === 0 ? (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-10 text-center text-sm text-neutral-500">
                    <p>No products in this project yet.</p>
                    <Link
                      href={`/catalog?project=${project.id}`}
                      className="rounded-full bg-terracotta-500 px-4 py-2 text-xs font-medium text-white hover:bg-terracotta-600"
                    >
                      + Add products
                    </Link>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {Array.from(groupsByManufacturer.entries()).map(([manufacturerId, entries]) => (
                      <div key={manufacturerId} className="rounded-xl border border-neutral-200 bg-white p-5">
                        <h3 className="font-medium text-neutral-900">
                          {manufacturersById.get(manufacturerId)?.name}
                        </h3>

                        <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                          {entries.map(({ item, product: p }) => (
                            <div key={item.id} className="overflow-hidden rounded-xl border border-neutral-200">
                              <Link href={`/catalog/${p.slug}`} className="relative block aspect-square w-full bg-neutral-100">
                                <Image src={p.imageUrl} alt={p.name} fill className="object-cover" />
                                {item.approvalStatus !== "pending" && (
                                  <span
                                    className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium ${
                                      item.approvalStatus === "approved"
                                        ? "bg-green-500 text-white"
                                        : item.approvalStatus === "rejected"
                                          ? "bg-red-500 text-white"
                                          : "bg-amber-500 text-white"
                                    }`}
                                  >
                                    {item.approvalStatus === "approved"
                                      ? "Approved"
                                      : item.approvalStatus === "rejected"
                                        ? "Rejected"
                                        : "Alt. requested"}
                                  </span>
                                )}
                              </Link>
                              <div className="flex items-center justify-between p-3">
                                <p className="truncate text-sm font-medium">{p.name}</p>
                                <form action={removeFromMoodBoard}>
                                  <input type="hidden" name="itemId" value={item.id} />
                                  <button className="text-xs text-neutral-400 hover:text-red-600">Remove</button>
                                </form>
                              </div>
                            </div>
                          ))}
                        </div>

                        <form action={sendBoardEnquiry} className="mt-4 flex flex-col gap-2 border-t border-neutral-200 pt-4">
                          <input type="hidden" name="moodBoardId" value={board!.id} />
                          <input type="hidden" name="manufacturerId" value={manufacturerId} />
                          <textarea
                            name="message"
                            placeholder={`Request samples from ${manufacturersById.get(manufacturerId)?.name} for this shortlist...`}
                            rows={2}
                            className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
                          />
                          <button
                            type="submit"
                            className="self-start rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
                          >
                            Request samples ({entries.length})
                          </button>
                        </form>
                      </div>
                    ))}
                  </div>
                )}

                {isOverBudget && cheaperAlternatives.length > 0 && (
                  <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="mb-2 text-sm font-medium text-red-800">
                      Over budget — cheaper alternatives to consider
                    </p>
                    <div className="flex flex-col gap-2">
                      {cheaperAlternatives.map((c) => (
                        <div key={c.forProduct} className="text-xs text-red-700">
                          <span className="font-medium">{c.forProduct}:</span>{" "}
                          {c.alternatives.map((a, i) => (
                            <span key={a.slug}>
                              {i > 0 && ", "}
                              <Link href={`/catalog/${a.slug}`} className="underline hover:text-red-900">
                                {a.name} (₹{a.pricePerSheet.toLocaleString("en-IN")})
                              </Link>
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            ))}
          </div>
        )}

        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">RFQs &amp; orders sent</h2>
          {rfqGroups.size === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No RFQs or multi-supplier orders yet. Generate an RFQ from a project&apos;s
              shortlist, or submit a cart with products from more than one manufacturer.
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from(rfqGroups.entries()).map(([rfqId, group]) => (
                <div key={rfqId} className="rounded-xl border border-neutral-200 bg-white p-4">
                  <p className="text-sm font-medium">
                    {enquiryTypeLabel(group[0].type)}
                    {group.length > 1 && (
                      <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                        Split across {group.length} suppliers
                      </span>
                    )}
                  </p>
                  {group.some((e) => e.quotedPrice != null) && (
                    <div className="mt-3 overflow-x-auto rounded-lg border border-neutral-200">
                      <table className="w-full min-w-[500px] text-left text-xs">
                        <thead>
                          <tr className="border-b border-neutral-200 bg-neutral-50 uppercase tracking-wide text-neutral-500">
                            <th className="px-3 py-2 font-medium">Supplier</th>
                            <th className="px-3 py-2 font-medium">Price</th>
                            <th className="px-3 py-2 font-medium">Delivery</th>
                            <th className="px-3 py-2 font-medium">Freight</th>
                            <th className="px-3 py-2 font-medium">Payment terms</th>
                            <th className="px-3 py-2 font-medium">Valid until</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {group.map((e) => (
                            <tr key={e.id}>
                              <td className="px-3 py-2 font-medium text-neutral-900">
                                {manufacturersById.get(e.manufacturerId)?.name}
                              </td>
                              <td className="px-3 py-2 text-neutral-700">
                                {e.quotedPrice != null ? `₹${e.quotedPrice.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-neutral-700">
                                {e.quotedDeliveryDays != null ? `${e.quotedDeliveryDays} days` : "—"}
                              </td>
                              <td className="px-3 py-2 text-neutral-700">
                                {e.freightCost != null ? `₹${e.freightCost.toLocaleString("en-IN")}` : "—"}
                              </td>
                              <td className="px-3 py-2 text-neutral-700">{e.paymentTerms ?? "—"}</td>
                              <td className="px-3 py-2 text-neutral-700">
                                {e.validUntil ? new Date(e.validUntil).toLocaleDateString() : "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-2 divide-y divide-neutral-100">
                    {group.map((e) => (
                      <details key={e.id} className="py-1.5">
                        <summary className="flex cursor-pointer list-none items-center justify-between">
                          <span className="text-sm text-neutral-700">
                            {manufacturersById.get(e.manufacturerId)?.name}
                          </span>
                          <span className="shrink-0 rounded-full bg-terracotta-50 px-2.5 py-1 text-xs font-medium text-terracotta-700">
                            {e.status}
                          </span>
                        </summary>
                        <div className="mt-2 rounded-lg bg-neutral-50 p-3">
                          {e.message && <p className="mb-2 text-sm text-neutral-600">{e.message}</p>}
                          <p className="mb-2 text-xs text-neutral-400">
                            {new Date(e.createdAt).toLocaleString()}
                          </p>
                          <EnquiryDetails enquiryId={e.id} />
                        </div>
                      </details>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-14">
          <h2 className="mb-4 text-lg font-semibold">Samples, orders &amp; enquiries</h2>
          {standaloneEnquiries.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
              No enquiries yet.
            </p>
          ) : (
            <div className="divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white">
              {standaloneEnquiries.map((e) => (
                <details key={e.id} className="p-4">
                  <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">
                        {manufacturersById.get(e.manufacturerId)?.name}
                        <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-500">
                          {enquiryTypeLabel(e.type)}
                        </span>
                      </p>
                      {e.message && <p className="mt-1 text-sm text-neutral-500">{e.message}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {e.type === "sample_request" && e.sampleStatus && (
                        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-600">
                          {e.sampleStatus}
                        </span>
                      )}
                      <span className="rounded-full bg-terracotta-50 px-2.5 py-1 text-xs font-medium text-terracotta-700">
                        {e.status}
                      </span>
                    </div>
                  </summary>
                  <div className="mt-3 rounded-lg bg-neutral-50 p-3">
                    <p className="mb-2 text-xs text-neutral-400">
                      {new Date(e.createdAt).toLocaleString()}
                    </p>
                    <EnquiryDetails enquiryId={e.id} />
                  </div>
                </details>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
