import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { SiteHeader } from "@/components/site-header";
import { getCategoryPriceStats } from "@/lib/price-intelligence";

const SPEC_ROWS: { label: string; get: (p: { [k: string]: unknown }) => string }[] = [
  { label: "Manufacturer", get: (p) => String(p.manufacturerName ?? "—") },
  { label: "Code", get: (p) => String(p.code ?? "—") },
  { label: "Collection", get: (p) => String(p.collection ?? "—") },
  { label: "Category", get: (p) => String(p.category ?? "—") },
  { label: "Wood specie", get: (p) => String(p.woodSpecie ?? "—") },
  { label: "Thickness", get: (p) => String(p.veneerThickness ?? "—") },
  { label: "Base", get: (p) => String(p.base ?? "—") },
  { label: "Finish", get: (p) => String(p.finish ?? "—") },
  { label: "Weight per panel", get: (p) => String(p.weightPerPanel ?? "—") },
  { label: "Flexibility", get: (p) => String(p.flexibility ?? "—") },
  {
    label: "Panel sizes",
    get: (p) => ((p.panelSizes as string[] | null)?.join(", ") ?? "—"),
  },
  {
    label: "Certifications",
    get: (p) => ((p.certifications as string[] | null)?.join(", ") ?? "—"),
  },
];

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  const { ids } = await searchParams;
  const idList = (ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  const products = idList.length
    ? await Promise.all(
        idList.map((id) => db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, id) }))
      )
    : [];
  const validProducts = products.filter(Boolean) as NonNullable<(typeof products)[number]>[];

  const manufacturers = validProducts.length
    ? await db.query.manufacturers.findMany({
        where: (m, { inArray }) =>
          inArray(m.id, validProducts.map((p) => p.manufacturerId)),
      })
    : [];
  const manufacturerNameById = new Map(manufacturers.map((m) => [m.id, m.name]));

  const rows = validProducts.map((p) => ({
    ...p,
    manufacturerName: manufacturerNameById.get(p.manufacturerId),
  }));

  const priceStats = rows.length ? await getCategoryPriceStats() : new Map();

  return (
    <div className="flex min-h-full flex-col">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <Link href="/catalog" className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to catalog
        </Link>
        <h1 className="mt-4 text-2xl font-semibold">Compare products</h1>

        {rows.length < 2 ? (
          <p className="mt-8 rounded-xl border border-dashed border-neutral-300 px-6 py-16 text-center text-sm text-neutral-500">
            Select 2-4 products from the catalog to compare them side by side.
          </p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full min-w-[600px] table-fixed border-collapse text-sm">
              <thead>
                <tr>
                  <th className="w-40 shrink-0"></th>
                  {rows.map((p) => (
                    <th key={p.id} className="px-3 pb-4 text-left align-top">
                      <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-neutral-100">
                        <Image
                          src={p.imageUrl}
                          alt={p.name}
                          fill
                          priority
                          sizes="(min-width: 1024px) 25vw, 45vw"
                          className="object-cover"
                        />
                      </div>
                      <Link
                        href={`/catalog/${p.slug}`}
                        className="mt-2 block font-medium text-neutral-900 hover:text-terracotta-600"
                      >
                        {p.name}
                      </Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-200">
                <tr>
                  <td className="py-2.5 pr-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Price / sheet
                  </td>
                  {rows.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 font-medium text-neutral-900">
                      {p.pricePerSheet != null ? `₹${p.pricePerSheet.toLocaleString("en-IN")}` : "—"}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="py-2.5 pr-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                    Category price range
                  </td>
                  {rows.map((p) => {
                    const stats = p.category ? priceStats.get(p.category) : null;
                    return (
                      <td key={p.id} className="px-3 py-2.5 text-xs text-neutral-500">
                        {stats?.listedMin != null && stats.listedMax != null
                          ? `₹${stats.listedMin.toLocaleString("en-IN")} – ₹${stats.listedMax.toLocaleString("en-IN")}`
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
                {SPEC_ROWS.map((row) => (
                  <tr key={row.label}>
                    <td className="py-2.5 pr-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
                      {row.label}
                    </td>
                    {rows.map((p) => (
                      <td key={p.id} className="px-3 py-2.5 text-neutral-800">
                        {row.get(p)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
