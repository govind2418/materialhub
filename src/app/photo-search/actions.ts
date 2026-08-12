"use server";

import { redirect } from "next/navigation";
import { db } from "@/db";
import { computeImageSignature, similarityScore } from "@/lib/image-similarity";

export async function searchByPhoto(formData: FormData): Promise<void> {
  const file = formData.get("photo") as File | null;
  if (!file || file.size === 0) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  const querySignature = await computeImageSignature(bytes);

  const allProducts = await db.query.products.findMany();
  const withSignature = allProducts.filter(
    (p): p is typeof p & { imageSignature: NonNullable<typeof p.imageSignature> } => !!p.imageSignature
  );

  const ranked = withSignature
    .map((p) => ({ id: p.id, score: similarityScore(querySignature, p.imageSignature) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 12);

  const ids = ranked.map((r) => r.id).join(",");
  redirect(`/photo-search/results?ids=${ids}`);
}
