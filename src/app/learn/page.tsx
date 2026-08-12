import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";

export const metadata: Metadata = {
  title: "Material Knowledge Centre",
  description: "Guides on materials, finishes, and specification from the MaterialOS team.",
};

export default async function LearnIndexPage() {
  const publishedGuides = await db.query.guides.findMany({
    where: (g, { eq }) => eq(g.published, true),
    orderBy: (g, { desc }) => desc(g.createdAt),
  });

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Material Knowledge Centre</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Guides on materials, finishes, and specification — written by the MaterialOS team.
        </p>

        {publishedGuides.length === 0 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            No guides published yet — check back soon.
          </p>
        ) : (
          <div className="mt-8 flex flex-col gap-4">
            {publishedGuides.map((g) => (
              <Link
                key={g.id}
                href={`/learn/${g.slug}`}
                className="block rounded-xl border border-neutral-200 bg-white p-5 hover:border-terracotta-300 hover:shadow-sm"
              >
                {g.category && (
                  <p className="text-xs font-medium uppercase tracking-wide text-terracotta-600">
                    {g.category}
                  </p>
                )}
                <p className="mt-1 text-lg font-medium text-neutral-900">{g.title}</p>
                {g.summary && <p className="mt-1 text-sm text-neutral-500">{g.summary}</p>}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
