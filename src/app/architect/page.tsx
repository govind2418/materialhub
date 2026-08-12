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

      return { project, board, groupsByManufacturer, totalItems: items.length };
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
          <Link href="/catalog" className="text-sm font-medium text-terracotta-600 hover:text-terracotta-700">
            Browse catalog →
          </Link>
        </div>

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
          <button
            type="submit"
            className="rounded-lg bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600"
          >
            New project
          </button>
        </form>

        {projectSections.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
            No projects yet. Create one above, or add a product to your mood board from the
            catalog to start one automatically.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-10">
            {projectSections.map(({ project, board, groupsByManufacturer, totalItems }) => (
              <section key={project.id} className="rounded-xl border border-neutral-200 bg-neutral-100 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">
                    {project.name}
                    {project.city && (
                      <span className="ml-2 text-xs font-normal text-neutral-500">{project.city}</span>
                    )}
                  </h2>
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
