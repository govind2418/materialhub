import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { PrintButton } from "./print-button";

export default async function ProductSpecPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const product = await db.query.products.findFirst({
    where: (p, { eq }) => eq(p.slug, slug),
  });
  if (!product) notFound();

  const manufacturer = await db.query.manufacturers.findFirst({
    where: (m, { eq }) => eq(m.id, product.manufacturerId),
  });

  const dimensions = [
    product.panelSizes?.length ? `Panel sizes: ${product.panelSizes.join(", ")}` : null,
    product.veneerThickness ? `Thickness: ${product.veneerThickness}` : null,
    product.weightPerPanel ? `Weight per panel: ${product.weightPerPanel}` : null,
  ]
    .filter(Boolean)
    .join(" · ") || "—";

  const rows: [string, string][] = [
    ["Name", product.name],
    ["Code", product.code ?? "—"],
    ["Brand", manufacturer?.name ?? "—"],
    ["Category", product.category ?? "—"],
    ["Finish", product.finish ?? "—"],
    ["Dimensions", dimensions],
    ["Certifications", product.certifications?.join(", ") || "—"],
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="mb-8 flex items-center justify-between print:hidden">
        <Link href={`/catalog/${product.slug}`} className="text-sm text-neutral-500 hover:text-neutral-900">
          ← Back to product
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-xl border border-neutral-200 bg-white p-8 print:border-none print:p-0">
        <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
          Material specification
        </p>
        <h1 className="mt-1 text-2xl font-semibold">{product.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Generated {new Date().toLocaleDateString()}
        </p>

        <div className="mt-6 grid gap-6 sm:grid-cols-[160px_1fr]">
          <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-neutral-100">
            <Image src={product.imageUrl} alt={product.name} fill className="object-cover" />
          </div>

          <dl className="divide-y divide-neutral-200 border-y border-neutral-200 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5">
                <dt className="shrink-0 text-neutral-500">{k}</dt>
                <dd className="text-right font-medium text-neutral-900">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        {product.installationGuideUrl && (
          <p className="mt-6 text-sm">
            <span className="text-neutral-500">Installation guide: </span>
            <a
              href={product.installationGuideUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-terracotta-600 underline"
            >
              {product.installationGuideUrl}
            </a>
          </p>
        )}

        <p className="mt-8 text-xs text-neutral-400">
          MaterialOS · {manufacturer?.name ?? "Manufacturer"} · Spec sheet for {product.name}
        </p>
      </div>
    </div>
  );
}
