import Link from "next/link";
import Image from "next/image";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { ProductCard } from "@/components/product-card";
import { PhotoSearchButton } from "@/components/photo-search-button";
import { getCurrentDbUser } from "@/lib/current-user";

const FALLBACK_FINISHES = ["Oak", "Walnut", "Marble", "Matte", "Gloss", "Stone"];

const ROLE_CARDS = [
  {
    role: "manufacturer",
    label: "Manufacturer",
    description: "List your catalog and get discovered by architects, distributors, and retailers.",
  },
  {
    role: "architect",
    label: "Architect / Designer",
    description: "Browse real product catalogs, build mood boards, and enquire directly.",
  },
  {
    role: "distributor-retailer",
    label: "Distributor / Retailer",
    description: "Track stock, manage territories, and reorder from manufacturers in one place.",
  },
  {
    role: "sales_rep",
    label: "Sales rep",
    description: "Follow up on leads and enquiries assigned to you, in one simple queue.",
  },
] as const;

export default async function Home() {
  const allProducts = await db.query.products.findMany({
    orderBy: (p, { asc }) => asc(p.name),
  });
  const featured = allProducts.slice(0, 8);

  const categories = Array.from(
    new Set(allProducts.map((p) => p.category).filter(Boolean))
  ) as string[];

  const distinctFinishes = Array.from(
    new Set(allProducts.map((p) => p.finish).filter(Boolean))
  ) as string[];

  const finishTiles =
    distinctFinishes.length >= 5
      ? distinctFinishes.slice(0, 6).map((finish) => ({
          finish,
          imageUrl: allProducts.find((p) => p.finish === finish)?.imageUrl,
        }))
      : FALLBACK_FINISHES.map((finish) => ({
          finish,
          imageUrl:
            allProducts.find((p) =>
              p.woodSpecie?.toLowerCase().includes(finish.toLowerCase())
            )?.imageUrl ?? allProducts[0]?.imageUrl,
        }));

  const dbUser = await getCurrentDbUser();

  function hrefForRole(role: string) {
    if (role === "distributor-retailer") {
      if (dbUser?.role === "distributor") return "/distributor";
      if (dbUser?.role === "retailer") return "/retailer";
      return "/onboarding";
    }
    if (dbUser?.role === role) {
      return role === "manufacturer"
        ? "/manufacturer"
        : role === "architect"
          ? "/architect"
          : "/sales-rep";
    }
    return `/onboarding?role=${role}`;
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />

      <main className="flex-1">
        <section className="border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-6 py-20">
            <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Find the exact finish you&apos;re picturing.
            </h1>
            <p className="max-w-xl text-lg text-neutral-500">
              Material Hub connects manufacturers with architects and designers —
              search visually, build mood boards, and enquire directly.
            </p>

            <form
              action="/catalog"
              method="GET"
              className="flex w-full max-w-xl items-stretch gap-2"
            >
              <input
                type="text"
                name="q"
                placeholder="light oak texture, office"
                className="flex-1 rounded-full border border-neutral-300 px-5 py-3 text-sm focus:border-neutral-900 focus:outline-none"
              />
              <button
                type="submit"
                className="rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white hover:bg-neutral-800"
              >
                Search
              </button>
              <PhotoSearchButton />
            </form>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/catalog"
                className="rounded-full border border-neutral-300 px-6 py-3 text-sm font-medium hover:border-neutral-400"
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
            <h2 className="text-lg font-semibold">Browse by finish</h2>
          </div>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {finishTiles.map(({ finish, imageUrl }) => (
              <Link
                key={finish}
                href={`/catalog?finish=${encodeURIComponent(finish)}`}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                  {imageUrl && (
                    <Image
                      src={imageUrl}
                      alt={finish}
                      fill
                      sizes="(min-width: 640px) 16vw, 30vw"
                      className="object-cover transition group-hover:scale-105"
                    />
                  )}
                </div>
                <p className="p-2 text-center text-xs font-medium text-neutral-700">
                  {finish}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-6 pb-14">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Continue as</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_CARDS.map((card) => (
              <Link
                key={card.role}
                href={hrefForRole(card.role)}
                className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900"
              >
                <div>
                  <p className="font-medium text-neutral-900">{card.label}</p>
                  <p className="mt-1.5 text-sm text-neutral-500">{card.description}</p>
                </div>
                <span className="mt-4 text-sm font-medium text-neutral-900">
                  Get started →
                </span>
              </Link>
            ))}
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
