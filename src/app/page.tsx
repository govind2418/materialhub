import Link from "next/link";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";

export default async function Home() {
  const featured = await db.query.products.findMany({
    limit: 8,
    orderBy: (p, { asc }) => asc(p.name),
  });

  const categories = Array.from(
    new Set((await db.query.products.findMany()).map((p) => p.category).filter(Boolean))
  ) as string[];

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Every material, in one visual catalog.
            </h1>
            <p className="max-w-xl text-lg text-neutral-500">
              Material Hub connects manufacturers with architects and designers —
              browse real product catalogs, build mood boards, and enquire directly.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Browse the catalog
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium hover:border-neutral-400"
              >
                List your products
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 py-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Browse by category</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {categories.map((c) => (
              <Link
                key={c}
                href={`/catalog?category=${encodeURIComponent(c)}`}
                className="rounded-full border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
              >
                {c}
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-20">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Featured products</h2>
            <Link href="/catalog" className="text-sm font-medium text-neutral-500 hover:text-neutral-900">
              View all →
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featured.map((p) => (
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
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-8 text-center text-xs text-neutral-400">
        Material Hub — built for manufacturers and architects.
      </footer>
    </div>
  );
}
