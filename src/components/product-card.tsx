import Image from "next/image";
import Link from "next/link";

export function ProductCard({
  slug,
  name,
  code,
  imageUrl,
  collection,
  verificationStatus,
  pricePerSheet,
}: {
  slug: string;
  name: string;
  code: string | null;
  imageUrl: string;
  collection: string | null;
  verificationStatus?: string;
  pricePerSheet?: number | null;
}) {
  return (
    <Link
      href={`/catalog/${slug}`}
      className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition hover:border-terracotta-300 hover:shadow-md"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-neutral-100">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
          className="object-cover transition group-hover:scale-105"
        />
        {verificationStatus && verificationStatus !== "pending" && (
          <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-medium text-green-700">
            ✓ Verified
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-neutral-900">{name}</p>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {code ? `${code} · ` : ""}
          {collection}
        </p>
        {pricePerSheet != null && (
          <p className="mt-1 text-sm font-medium text-neutral-900">
            ₹{pricePerSheet.toLocaleString("en-IN")}
            <span className="text-xs font-normal text-neutral-500">/sheet</span>
          </p>
        )}
      </div>
    </Link>
  );
}
