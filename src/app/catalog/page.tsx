import Link from "next/link";
import { db } from "@/db";
import { ProductCard } from "@/components/product-card";
import { SiteHeader } from "@/components/site-header";

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; collection?: string }>;
}) {
  const { category, collection } = await searchParams;

  const allProducts = await db.query.products.findMany({
    orderBy: (p, { asc }) => asc(p.name),
  });

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category).filter(Boolean))
  ) as string[];
  const collections = Array.from(
    new Set(allProducts.map((p) => p.collection).filter(Boolean))
  ) as string[];

  const filtered = allProducts.filter(
    (p) =>
      (!category || p.category === category) &&
      (!collection || p.collection === collection)
  );

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Catalog</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {filtered.length} products from verified manufacturers.
        </p>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <FilterPill
          label="All categories"
          active={!category}
          href="/catalog"
        />
        {categories.map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={category === c}
            href={`/catalog?category=${encodeURIComponent(c)}`}
          />
        ))}
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        {collections.map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={collection === c}
            href={`/catalog?${category ? `category=${encodeURIComponent(category)}&` : ""}collection=${encodeURIComponent(c)}`}
            subtle
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {filtered.map((p) => (
          <ProductCard
            key={p.id}
            slug={p.slug}
            name={p.name}
            code={p.code}
            imageUrl={p.imageUrl}
            collection={p.collection}
          />
        ))}
      </div>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  href,
  active,
  subtle,
}: {
  label: string;
  href: string;
  active: boolean;
  subtle?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white"
          : subtle
            ? "border-neutral-200 text-neutral-500 hover:border-neutral-400"
            : "border-neutral-300 text-neutral-700 hover:border-neutral-400"
      }`}
    >
      {label}
    </Link>
  );
}
