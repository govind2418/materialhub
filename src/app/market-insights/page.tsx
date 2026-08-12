import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { getDemandTrends, getMostShortlistedFinishes, getEmergingCategories } from "@/lib/demand-intelligence";

// Rolling-window demand data — must be computed per-request, not frozen at build time.
export const dynamic = "force-dynamic";

function InsightCard({
  title,
  emptyLabel,
  rows,
}: {
  title: string;
  emptyLabel: string;
  rows: { value: string; count: number }[];
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <h2 className="mb-3 text-sm font-semibold text-neutral-900">{title}</h2>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-400">{emptyLabel}</p>
      ) : (
        <ol className="flex flex-col gap-2 text-sm">
          {rows.map((r, i) => (
            <li key={r.value} className="flex items-center justify-between">
              <span className="text-neutral-700">
                <span className="mr-2 text-neutral-400">{i + 1}.</span>
                {r.value}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                {r.count}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default async function MarketInsightsPage() {
  const [demand, shortlistedFinishes, emergingCategories] = await Promise.all([
    getDemandTrends(),
    getMostShortlistedFinishes(),
    getEmergingCategories(),
  ]);

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <h1 className="text-2xl font-semibold">Market insights</h1>
        <p className="mt-1 max-w-2xl text-sm text-neutral-500">
          Aggregate, anonymized demand signals from MaterialOS&apos;s architect community — no
          individual user data is shown. This fills in as more architects search and shortlist
          on the platform.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InsightCard
            title="What architects are searching for"
            emptyLabel="Not enough search data yet."
            rows={demand.topCategories}
          />
          <InsightCard
            title="Most shortlisted finishes"
            emptyLabel="Not enough mood-board data yet."
            rows={shortlistedFinishes}
          />
          <InsightCard
            title="Emerging categories"
            emptyLabel="Not enough recent search history to detect a trend yet."
            rows={emergingCategories.map((c) => ({ value: c.value, count: c.recentCount }))}
          />
        </div>

        <div className="mt-10 rounded-xl border border-terracotta-200 bg-terracotta-50 p-5 text-sm text-terracotta-800">
          <p className="font-medium">Not on MaterialOS yet?</p>
          <p className="mt-1">
            These trends reflect real, live demand from architects sourcing materials. Manufacturers
            on the platform get the full breakdown — pricing benchmarks, lead funnels, and
            category-level demand — in their dashboard.
          </p>
          <Link
            href="/onboarding"
            className="mt-3 inline-block rounded-lg bg-terracotta-600 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-700"
          >
            List your products →
          </Link>
        </div>
      </main>
    </div>
  );
}
