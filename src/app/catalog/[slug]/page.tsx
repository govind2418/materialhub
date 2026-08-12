import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getCurrentDbUser } from "@/lib/current-user";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { addToCart } from "@/app/cart/actions";
import { getCategoryPriceStats } from "@/lib/price-intelligence";
import { addToMoodBoard, enquireRepresentative, sendEnquiry } from "./actions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) return {};

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.id, product.manufacturerId),
  });

  const description = [product.category, product.finish, product.woodSpecie, manufacturer?.name]
    .filter(Boolean)
    .join(" · ") || `${product.name} on MaterialOS`;

  return {
    title: product.name,
    description,
    openGraph: {
      title: product.name,
      description,
      images: [{ url: product.imageUrl }],
    },
  };
}

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

  const priceBenchmark = product.category
    ? (await getCategoryPriceStats()).get(product.category) ?? null
    : null;

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
  let availableNearProjectCity: string | null = null;
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

      const productDistributorLinks = await db.query.productDistributors.findMany({
        where: (d, { eq }) => eq(d.productId, product.id),
      });
      const distributorUserIds = productDistributorLinks.map((d) => d.distributorUserId);
      const nearbyDistributors = distributorUserIds.length
        ? await db.query.users.findMany({
            where: (u, { inArray }) => inArray(u.id, distributorUserIds),
          })
        : [];
      const nearbyMatch = nearbyDistributors.find(
        (u) => u.city?.toLowerCase() === recentProject.city!.toLowerCase()
      );
      if (nearbyMatch?.city) {
        availableNearProjectCity = nearbyMatch.city;
      }
    }
  }

  const relatedLinks = await db.query.relatedProducts.findMany({
    where: (r, { eq }) => eq(r.productId, product.id),
  });
  const relatedProductsById = relatedLinks.length
    ? new Map(
        (
          await db.query.products.findMany({
            where: (p, { inArray }) =>
              inArray(p.id, relatedLinks.map((r) => r.relatedProductId)),
          })
        ).map((p) => [p.id, p])
      )
    : new Map<string, Awaited<ReturnType<typeof db.query.products.findFirst>>>();

  const RELATION_GROUPS = [
    { type: "alternative_to" as const, label: "Alternatives" },
    { type: "compatible_with" as const, label: "Compatible with" },
    { type: "used_with" as const, label: "Used with" },
    { type: "similar_to" as const, label: "Similar to" },
  ];

  const relatedGroups = RELATION_GROUPS.map((group) => ({
    ...group,
    products: relatedLinks
      .filter((r) => r.relationType === group.type)
      .map((r) => relatedProductsById.get(r.relatedProductId))
      .filter((p): p is NonNullable<typeof p> => !!p),
  }));

  const alternativesGroup = relatedGroups.find((g) => g.type === "alternative_to")!;
  if (alternativesGroup.products.length < 3 && product.category) {
    const excludeIds = new Set([
      product.id,
      ...relatedGroups.flatMap((g) => g.products.map((p) => p.id)),
    ]);
    const fallback = await db.query.products.findMany({
      where: (p, { eq }) => eq(p.category, product.category!),
      limit: 5 + excludeIds.size,
    });
    const fill = fallback
      .filter((p) => !excludeIds.has(p.id))
      .slice(0, 5 - alternativesGroup.products.length);
    alternativesGroup.products = [...alternativesGroup.products, ...fill];
  }

  for (const group of relatedGroups) {
    group.products = group.products.slice(0, 5);
  }
  const hasAnyAlternatives = relatedGroups.some((g) => g.products.length > 0);

  const featuredInLinks = await db.query.projectReferenceProducts.findMany({
    where: (rp, { eq }) => eq(rp.productId, product.id),
  });
  const featuredIn = featuredInLinks.length
    ? await db.query.projectReferences.findMany({
        where: (r, { inArray }) => inArray(r.id, featuredInLinks.map((l) => l.projectReferenceId)),
        orderBy: (r, { desc }) => desc(r.createdAt),
      })
    : [];

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
    ["FSC status", product.fscStatus],
    [
      "Recycled content",
      product.recycledContentPercent != null ? `${product.recycledContentPercent}%` : null,
    ],
    ["VOC rating", product.vocRating],
  ];

  async function addAction() {
    "use server";
    await addToMoodBoard(product!.id, projectId);
  }

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: product.imageUrl,
    description: specs
      .filter(([, v]) => v)
      .map(([k, v]) => `${k}: ${v}`)
      .join(", "),
    sku: product.code ?? undefined,
    brand: manufacturer ? { "@type": "Brand", name: manufacturer.name } : undefined,
    offers: product.pricePerSheet
      ? {
          "@type": "Offer",
          priceCurrency: "INR",
          price: product.pricePerSheet,
          availability: "https://schema.org/InStock",
        }
      : undefined,
  };

  return (
    <div className="flex min-h-full flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
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
            {manufacturer && (
              <Link
                href={`/manufacturers/${manufacturer.slug}`}
                className="text-sm font-medium text-neutral-500 hover:text-terracotta-600"
              >
                {manufacturer.name}
              </Link>
            )}
            {product.verificationStatus !== "pending" && (
              <span className="rounded-full bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">
                ✓ {product.verificationStatus === "platform_verified" ? "Platform Verified" : "Manufacturer Verified"}
              </span>
            )}
          </div>
          <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>

          {product.pricePerSheet && (
            <p className="mt-2 text-xl font-semibold text-neutral-900">
              ₹{product.pricePerSheet.toLocaleString("en-IN")}
              <span className="text-sm font-normal text-neutral-500"> / sheet</span>
            </p>
          )}
          {priceBenchmark?.listedMin != null && priceBenchmark.listedMax != null && (
            <p className="mt-1 text-xs text-neutral-500">
              Typical range for {product.category}: ₹{priceBenchmark.listedMin.toLocaleString("en-IN")}
              {" – "}₹{priceBenchmark.listedMax.toLocaleString("en-IN")} per sheet (
              {priceBenchmark.listedCount} listed product{priceBenchmark.listedCount === 1 ? "" : "s"})
              {priceBenchmark.quotedCount > 0 &&
                ` · recent quotes avg ₹${priceBenchmark.quotedAvg!.toLocaleString("en-IN")}`}
            </p>
          )}

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
          <p className="mt-2 text-xs text-neutral-400">
            Last updated {new Date(product.updatedAt).toLocaleDateString()}
          </p>

          {availableNearProjectCity && (
            <p className="mt-3 rounded-full bg-green-50 px-3 py-1.5 text-xs font-medium text-green-700">
              📍 Available from a distributor in {availableNearProjectCity}
            </p>
          )}

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

          <div className="mt-4 flex flex-wrap gap-4">
            {product.installationGuideUrl && (
              <a
                href={product.installationGuideUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
              >
                Installation guide ↗
              </a>
            )}
            <Link
              href={`/catalog/${product.slug}/spec`}
              className="inline-block text-sm font-medium text-terracotta-600 hover:text-terracotta-700"
            >
              Generate specification ↗
            </Link>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {isArchitect ? (
              <>
                <form action={addToCart} className="flex gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    defaultValue={1}
                    className="w-20 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm"
                  />
                  <button
                    type="submit"
                    className="flex-1 rounded-lg bg-terracotta-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-terracotta-600"
                  >
                    Add to Cart
                  </button>
                </form>

                <div className="grid grid-cols-2 gap-2">
                  <form action={sendEnquiry}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-terracotta-500 px-4 py-2.5 text-sm font-medium text-terracotta-700 hover:bg-terracotta-500 hover:text-white"
                    >
                      Get Sample
                    </button>
                  </form>
                  <form action={addAction}>
                    <button
                      type="submit"
                      className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-terracotta-400 hover:text-terracotta-600"
                    >
                      {targetProject ? "Add to project" : "Add to Mood Board"}
                    </button>
                  </form>
                </div>

                <details className="rounded-lg border border-neutral-200">
                  <summary className="cursor-pointer list-none px-4 py-2.5 text-sm font-medium text-neutral-700 hover:text-terracotta-600">
                    Enquire representative
                  </summary>
                  <form action={enquireRepresentative} className="flex flex-col gap-2 border-t border-neutral-200 p-3">
                    <input type="hidden" name="productId" value={product.id} />
                    <textarea
                      name="message"
                      placeholder={`Ask ${manufacturer?.name}'s representative about pricing, lead time, or bulk orders...`}
                      rows={3}
                      className="rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-terracotta-500 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="self-start rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800"
                    >
                      Send to representative
                    </button>
                  </form>
                </details>
              </>
            ) : user ? (
              <p className="text-sm text-neutral-500">
                Sign in as an architect to buy, request a sample, or enquire.
              </p>
            ) : (
              <Link
                href="/sign-in"
                className="w-full rounded-lg bg-terracotta-500 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-terracotta-600"
              >
                Sign in to buy or enquire
              </Link>
            )}
          </div>
        </div>
      </div>

      {featuredIn.length > 0 && (
        <div className="mt-10">
          <h2 className="mb-4 text-sm font-medium text-neutral-700">Featured in</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {featuredIn.map((ref) => (
              <div key={ref.id} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4">
                {ref.imageUrl && (
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                    <Image src={ref.imageUrl} alt={ref.title} fill className="object-cover" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-neutral-900">{ref.title}</p>
                  {ref.category && (
                    <p className="text-xs text-neutral-500">{ref.category}</p>
                  )}
                  {ref.description && (
                    <p className="mt-1 text-xs text-neutral-500">{ref.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasAnyAlternatives && (
        <details className="mt-10">
          <summary className="w-fit cursor-pointer list-none rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 hover:border-terracotta-400 hover:text-terracotta-600">
            Find me an alternative
          </summary>
          <div className="mt-4 flex flex-col gap-6">
            {relatedGroups
              .filter((group) => group.products.length > 0)
              .map((group) => (
                <div key={group.type}>
                  <h3 className="mb-3 text-sm font-medium text-neutral-700">{group.label}</h3>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {group.products.map((alt) => (
                      <ProductCard
                        key={alt.id}
                        slug={alt.slug}
                        name={alt.name}
                        code={alt.code}
                        imageUrl={alt.imageUrl}
                        collection={alt.collection}
                        verificationStatus={alt.verificationStatus}
                        pricePerSheet={alt.pricePerSheet}
                      />
                    ))}
                  </div>
                </div>
              ))}
          </div>
        </details>
      )}
      </div>
    </div>
  );
}
