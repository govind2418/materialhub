import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { db } from "@/db";
import { getLatestMembership, isMembershipActive } from "@/lib/premium";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const architect = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.publicSlug, slug), eq(u.publicProfileEnabled, true)),
  });
  if (!architect) return {};

  return {
    title: architect.name,
    description: architect.bio ?? `${architect.name}'s portfolio on MaterialOS.`,
  };
}

export default async function ArchitectProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const architect = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(eq(u.publicSlug, slug), eq(u.publicProfileEnabled, true)),
  });
  if (!architect) notFound();

  const membership = await getLatestMembership(architect.id);
  const isPremium = isMembershipActive(membership);

  const publicProjects = await db.query.projects.findMany({
    where: (p, { and, eq }) => and(eq(p.architectUserId, architect.id), eq(p.isPublicPortfolio, true)),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });

  let topCategories: { value: string; count: number }[] = [];
  let topFinishes: { value: string; count: number }[] = [];

  if (publicProjects.length > 0) {
    const boards = await db.query.moodBoards.findMany({
      where: (b, { inArray }) => inArray(b.projectId, publicProjects.map((p) => p.id)),
    });
    if (boards.length > 0) {
      const items = await db.query.moodBoardItems.findMany({
        where: (i, { inArray }) => inArray(i.moodBoardId, boards.map((b) => b.id)),
      });
      if (items.length > 0) {
        const productList = await db.query.products.findMany({
          where: (p, { inArray }) => inArray(p.id, items.map((i) => i.productId)),
        });
        const categoryCounts = new Map<string, number>();
        const finishCounts = new Map<string, number>();
        for (const p of productList) {
          if (p.category) categoryCounts.set(p.category, (categoryCounts.get(p.category) ?? 0) + 1);
          if (p.finish) finishCounts.set(p.finish, (finishCounts.get(p.finish) ?? 0) + 1);
        }
        const topN = (m: Map<string, number>) =>
          [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([value, count]) => ({ value, count }));
        topCategories = topN(categoryCounts);
        topFinishes = topN(finishCounts);
      }
    }
  }

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold">{architect.name}</h1>
          {isPremium && (
            <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              ✦ Architect Circle
            </span>
          )}
        </div>
        {architect.companyName && <p className="mt-1 text-sm text-neutral-500">{architect.companyName}</p>}
        {architect.city && <p className="text-sm text-neutral-500">{architect.city}</p>}
        {architect.bio && <p className="mt-4 text-sm text-neutral-700">{architect.bio}</p>}

        {(topCategories.length > 0 || topFinishes.length > 0) && (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {topCategories.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Material preferences · categories
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {topCategories.map((c) => (
                    <li key={c.value} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                      {c.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {topFinishes.length > 0 && (
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-neutral-500">
                  Material preferences · finishes
                </p>
                <ul className="flex flex-wrap gap-1.5">
                  {topFinishes.map((f) => (
                    <li key={f.value} className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-700">
                      {f.value}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <h2 className="mb-4 mt-10 text-lg font-semibold">Portfolio</h2>
        {publicProjects.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 px-6 py-10 text-center text-sm text-neutral-500">
            No public projects yet.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {publicProjects.map((p) => (
              <div key={p.id} className="rounded-xl border border-neutral-200 bg-white p-4">
                <p className="font-medium text-neutral-900">{p.name}</p>
                {p.city && <p className="text-xs text-neutral-500">{p.city}</p>}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
