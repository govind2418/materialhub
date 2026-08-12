import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { getResponseTimeStats, formatResponseTime } from "@/lib/manufacturer-reputation";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.slug, slug),
  });
  if (!manufacturer) return {};

  return {
    title: manufacturer.name,
    description: manufacturer.description ?? `${manufacturer.name}'s product catalog on MaterialOS.`,
  };
}

export default async function ManufacturerProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.slug, slug),
  });
  if (!manufacturer) notFound();

  const manufacturerProducts = await db.query.products.findMany({
    where: (p, { eq }) => eq(p.manufacturerId, manufacturer.id),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });

  const verifiedCount = manufacturerProducts.filter((p) => p.verificationStatus !== "pending").length;
  const platformVerifiedCount = manufacturerProducts.filter(
    (p) => p.verificationStatus === "platform_verified"
  ).length;

  const certifications = [
    ...new Set(manufacturerProducts.flatMap((p) => p.certifications ?? [])),
  ].sort();

  const responseStats = await getResponseTimeStats(manufacturer.id);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="flex items-start gap-4">
          {manufacturer.logoUrl && (
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-neutral-100">
              <Image src={manufacturer.logoUrl} alt={manufacturer.name} fill className="object-cover" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-semibold">{manufacturer.name}</h1>
            {manufacturer.city && <p className="text-sm text-neutral-500">{manufacturer.city}</p>}
            {manufacturer.description && (
              <p className="mt-2 max-w-2xl text-sm text-neutral-600">{manufacturer.description}</p>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Verified products
            </p>
            <p className="mt-1 text-xl font-semibold text-neutral-900">
              {verifiedCount} / {manufacturerProducts.length}
            </p>
            {platformVerifiedCount > 0 && (
              <p className="mt-0.5 text-xs text-green-700">
                {platformVerifiedCount} platform-verified
              </p>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Certifications on file
            </p>
            {certifications.length === 0 ? (
              <p className="mt-1 text-sm text-neutral-400">None on file yet.</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-1.5">
                {certifications.map((c) => (
                  <li key={c} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700">
                    {c}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
              Response time
            </p>
            {responseStats.avgHours != null ? (
              <p className="mt-1 text-sm text-neutral-700">
                Typically responds in {formatResponseTime(responseStats.avgHours)} (based on{" "}
                {responseStats.respondedCount} enquir{responseStats.respondedCount === 1 ? "y" : "ies"})
              </p>
            ) : (
              <p className="mt-1 text-sm text-neutral-400">Not enough response data yet.</p>
            )}
          </div>
        </div>

        <h2 className="mb-4 mt-10 text-lg font-semibold">
          Products ({manufacturerProducts.length})
        </h2>
        {manufacturerProducts.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
            No products listed yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {manufacturerProducts.map((p) => (
              <ProductCard
                key={p.id}
                slug={p.slug}
                name={p.name}
                code={p.code}
                imageUrl={p.imageUrl}
                collection={p.collection}
                verificationStatus={p.verificationStatus}
                pricePerSheet={p.pricePerSheet}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
