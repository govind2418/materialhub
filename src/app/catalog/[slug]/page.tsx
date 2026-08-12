import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { addToMoodBoard, sendEnquiry } from "./actions";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ project?: string }>;
}) {
  const { slug } = await params;
  const { project: projectId } = await searchParams;

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });

  if (!product) notFound();

  await db
    .update(products)
    .set({ viewCount: sql`${products.viewCount} + 1` })
    .where(eq(products.id, product.id));

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.id, product.manufacturerId),
  });

  const user = await getCurrentDbUser();
  const isArchitect = user?.role === "architect";

  let targetProject = null;
  if (isArchitect && user && projectId) {
    const requested = await db.query.projects.findFirst({
      where: (p, { eq }) => eq(p.id, projectId),
    });
    if (requested && requested.architectUserId === user.id) {
      targetProject = requested;
    }
  }

  let territoryContact: { name: string; role: string; phone: string | null; email: string } | null = null;
  if (isArchitect && user) {
    const recentProject = await db.query.projects.findFirst({
      where: (p, { eq }) => eq(p.architectUserId, user.id),
      orderBy: (p, { desc }) => desc(p.createdAt),
    });

    if (recentProject?.city) {
      const activeTeam = await db.query.manufacturerTeamMembers.findMany({
        where: (m, { and, eq }) =>
          and(eq(m.manufacturerId, product.manufacturerId), eq(m.status, "active")),
      });
      const teamUserIds = activeTeam.map((m) => m.userId).filter((id): id is string => !!id);
      const teamUsers = teamUserIds.length
        ? await db.query.users.findMany({
            where: (u, { inArray }) => inArray(u.id, teamUserIds),
          })
        : [];
      const match = teamUsers.find(
        (u) => u.city?.toLowerCase() === recentProject.city!.toLowerCase()
      );
      if (match) {
        const memberRecord = activeTeam.find((m) => m.userId === match.id);
        territoryContact = {
          name: match.name,
          role: memberRecord?.role === "sales_rep" ? "Sales rep" : "Distributor",
          phone: match.phone,
          email: match.email,
        };
      }
    }
  }

  const relatedLinks = await db.query.relatedProducts.findMany({
    where: (r, { eq }) => eq(r.productId, product.id),
  });
  let alternatives = relatedLinks.length
    ? await db.query.products.findMany({
        where: (p, { inArray }) =>
          inArray(p.id, relatedLinks.map((r) => r.relatedProductId)),
      })
    : [];
  if (alternatives.length < 3 && product.category) {
    const excludeIds = new Set([product.id, ...alternatives.map((a) => a.id)]);
    const fallback = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.category, product.category!),
      limit: 5 + excludeIds.size,
    });
    const fill = fallback.filter((p) => !excludeIds.has(p.id)).slice(0, 5 - alternatives.length);
    alternatives = [...alternatives, ...fill];
  }
  alternatives = alternatives.slice(0, 5);

  const specs: [string, string | null][] = [
    ["Code", product.code],
    ["Collection", product.collection],
    ["Wood specie", product.woodSpecie],
    ["Thickness", product.veneerThickness],
    ["Base", product.base],
    ["Finish", product.finish],
    ["Weight per panel", product.weightPerPanel],
    ["Flexibility", product.flexibility],
    ["Panel sizes", product.panelSizes?.join(", ") ?? null],
    ["Certifications", product.certifications?.join(", ") ?? null],
  ];

  async function addAction() {
    "use server";
    await addToMoodBoard(product!.id, projectId);
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <Link
        href={targetProject ? `/catalog?project=${targetProject.id}` : "/catalog"}
        className="text-sm text-neutral-500 hover:text-neutral-900"
      >
        ← Back to catalog
      </Link>

      {targetProject && (
        <div className="mt-3 rounded-lg border border-terracotta-200 bg-terracotta-50 px-4 py-2.5 text-sm text-terracotta-700">
          Adding to project: <span className="font-medium">{targetProject.name}</span>
        </div>
      )}

      <div className="mt-4 grid gap-10 md:grid-cols-2">
        <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
          <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-neutral-500">{manufacturer?.name}</p>
            {product.verificationStatus !== "pending" && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                ✓ {product.verificationStatus === "platform_verified" ? "Platform Verified" : "Manufacturer Verified"}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>

          <dl className="mt-6 divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {specs
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex justify-between py-2.5">
                  <dt className="text-neutral-500">{k}</dt>
                  <dd className="font-medium text-neutral-900">{v}</dd>
                </div>
              ))}
          </dl>

          {territoryContact && (
            <div className="mt-4 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
                Your contact for this project
              </p>
              <p className="mt-1 font-medium text-neutral-900">
                {territoryContact.name} · {territoryContact.role}
              </p>
              <p className="text-neutral-600">
                {territoryContact.phone ?? territoryContact.email}
              </p>
            </div>
          )}

          {product.installationGuideUrl && (
            <a
              href={product.installationGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              Installation guide ↗
            </a>
          )}

          <div className="mt-6 flex flex-col gap-3">
            {isArchitect ? (
              <>
                <form action={addAction}>
                  <button
                    type="submit"
                    className="w-full rounded-lg border border-terracotta-500 px-4 py-2.5 text-sm font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
                  >
                    {targetProject ? `Add to "${targetProject.name}"` : "Add to Mood Board"}
                  </button>
                </form>

                <form action={sendEnquiry} className="flex flex-col gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <textarea
                    name="message"
                    placeholder={`Ask ${manufacturer?.name} about pricing, samples, or lead time...`}
                    rows={3}
                    className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
                  >
                    Send Enquiry
                  </button>
                </form>
              </>
            ) : user ? (
              <p className="text-sm text-neutral-500">
                Sign in as an architect to add this to a mood board or send an enquiry.
              </p>
            ) : (
              <Link
                href="/sign-in"
                className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Sign in to enquire
              </Link>
            )}
          </div>
        </div>
      </div>

      {alternatives.length > 0 && (
        <details className="mt-10">
          <summary className="w-fit cursor-pointer list-none rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-terracotta-400 hover:text-terracotta-600">
            Find me an alternative
          </summary>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {alternatives.map((alt) => (
              <ProductCard
                key={alt.id}
                slug={alt.slug}
                name={alt.name}
                code={alt.code}
                imageUrl={alt.imageUrl}
                collection={alt.collection}
                verificationStatus={alt.verificationStatus}
              />
            ))}
          </div>
        </details>
      )}
      </div>
    </div>
  );
}
