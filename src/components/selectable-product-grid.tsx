"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  slug: string;
  name: string;
  code: string | null;
  imageUrl: string;
  collection: string | null;
  verificationStatus?: string;
};

export function SelectableProductGrid({
  products,
  projectId,
}: {
  products: Product[];
  projectId?: string;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const router = useRouter();

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="relative">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((p) => {
          const isSelected = selected.includes(p.id);
          return (
            <div
              key={p.id}
              className={`group relative overflow-hidden rounded-xl border bg-white transition ${
                isSelected ? "border-terracotta-500 ring-1 ring-terracotta-500" : "border-neutral-200 hover:border-terracotta-300"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-label={isSelected ? "Remove from compare" : "Add to compare"}
                className={`absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium ${
                  isSelected
                    ? "border-terracotta-500 bg-terracotta-500 text-white"
                    : "border-neutral-300 bg-white/90 text-neutral-500"
                }`}
              >
                {isSelected ? "✓" : ""}
              </button>
              <Link
                href={projectId ? `/catalog/${p.slug}?project=${projectId}` : `/catalog/${p.slug}`}
                className="block"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={p.imageUrl}
                    alt={p.name}
                    fill
                    sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                  {p.verificationStatus && p.verificationStatus !== "pending" && (
                    <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-green-700">
                      ✓ Verified
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <p className="truncate text-sm font-medium text-neutral-900">{p.name}</p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {p.code ? `${p.code} · ` : ""}
                    {p.collection}
                  </p>
                </div>
              </Link>
            </div>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="sticky bottom-4 mt-6 flex items-center justify-between rounded-full border border-neutral-200 bg-white px-5 py-3 shadow-lg">
          <span className="text-sm text-neutral-600">
            {selected.length} selected {selected.length < 2 && "— pick at least 2"}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="text-xs font-medium text-neutral-400 hover:text-neutral-700"
            >
              Clear
            </button>
            <button
              type="button"
              disabled={selected.length < 2}
              onClick={() => router.push(`/compare?ids=${selected.join(",")}`)}
              className="rounded-full bg-terracotta-500 px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Compare ({selected.length})
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
