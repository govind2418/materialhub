import Link from "next/link";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";

export default async function PhotoSearchResultsPage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = (ids ?? "").split(",").map((s) => s.trim()).filter(Boolean);

  const products = idList.length
    ? await db.query.products.findMany({ where: (p, { inArray }) => inArray(p.id, idList) })
    : [];
  const productsById = new Map(products.map((p) => [p.id, p]));
  const orderedProducts = idList.map((id) => productsById.get(id)).filter((p): p is NonNullable<typeof p> => !!p);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Link href="/" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to home
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Visual search results</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Closest visual matches to your photo, ranked by structural and color similarity —
          not a trained model, so treat this as a starting point.
        </p>

        {orderedProducts.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            No visual matches found. Products need an uploaded image (not the placeholder) to be
            searchable this way — this fills in as manufacturers upload real photos.
          </p>
        ) : (
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {orderedProducts.map((p) => (
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
