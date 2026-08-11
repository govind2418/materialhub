import Link from "next/link";
import { db } from "@/db";
import { SelectableProductGrid } from "@/components/selectable-product-grid";
import { SiteHeader } from "@/components/site-header";

type CatalogSearchParams = {
  category?: string;
  collection?: string;
  finish?: string;
  q?: string;
};

function buildHref(current: CatalogSearchParams, overrides: CatalogSearchParams) {
  const merged = { ...current, ...overrides };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/catalog?${qs}` : "/catalog";
}

export default async function CatalogPage({
  searchParams,
}: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const { category, collection, finish, q } = await searchParams;

  const allProducts = await db.query.products.findMany({
    orderBy: (p, { asc }) => asc(p.name),
  });

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category).filter(Boolean))
  ) as string[];
  const collections = Array.from(
    new Set(allProducts.map((p) => p.collection).filter(Boolean))
  ) as string[];
  const finishes = Array.from(
    new Set(allProducts.map((p) => p.finish).filter(Boolean))
  ) as string[];

  const query = q?.trim().toLowerCase();

  const filtered = allProducts.filter((p) => {
    if (category && p.category !== category) return false;
    if (collection && p.collection !== collection) return false;
    if (finish && p.finish !== finish) return false;
    if (query) {
      const haystack = [p.name, p.code, p.category, p.finish, p.collection]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const current: CatalogSearchParams = { category, collection, finish, q };

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold">Catalog</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {filtered.length} products from verified manufacturers.
            {query && <> Showing results for &ldquo;{q}&rdquo;.</>}
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <FilterPill
            label="All categories"
            active={!category}
            href={buildHref(current, { category: undefined })}
          />
          {categories.map((c) => (
            <FilterPill
              key={c}
              label={c}
              active={category === c}
              href={buildHref(current, { category: c })}
            />
          ))}
        </div>

        {collections.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {collections.map((c) => (
              <FilterPill
                key={c}
                label={c}
                active={collection === c}
                href={buildHref(current, { collection: collection === c ? undefined : c })}
                subtle
              />
            ))}
          </div>
        )}

        {finishes.length > 0 && (
          <div className="mb-8 flex flex-wrap gap-2">
            {finishes.map((f) => (
              <FilterPill
                key={f}
                label={f}
                active={finish === f}
                href={buildHref(current, { finish: finish === f ? undefined : f })}
                subtle
              />
            ))}
          </div>
        )}

        {filtered.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            No products match these filters yet.
          </p>
        ) : (
          <>
            <p className="mb-3 text-xs text-neutral-400">
              Tap the checkmark on a product to select it for comparison (2-4 products).
            </p>
            <SelectableProductGrid
              products={filtered.map((p) => ({
                id: p.id,
                slug: p.slug,
                name: p.name,
                code: p.code,
                imageUrl: p.imageUrl,
                collection: p.collection,
              }))}
            />
          </>
        )}
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
          ? "border-terracotta-500 bg-terracotta-500 text-white"
          : subtle
            ? "border-neutral-200 bg-white text-neutral-500 hover:border-terracotta-300 hover:text-terracotta-600"
            : "border-neutral-300 bg-white text-neutral-700 hover:border-terracotta-300 hover:text-terracotta-600"
      }`}
    >
      {label}
    </Link>
  );
}
