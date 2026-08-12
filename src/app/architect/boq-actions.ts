"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as XLSX from "xlsx";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { boqUploads, enquiries, enquiryItems } from "@/db/schema";
import type { BoqRow } from "@/db/schema";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2);
}

function findDescriptionKey(headers: string[]): string | null {
  return headers.find((h) => /item|description|material|product|spec/i.test(h)) ?? null;
}
function findQuantityKey(headers: string[]): string | null {
  return headers.find((h) => /qty|quantity|nos|count/i.test(h)) ?? null;
}

export async function uploadBoq(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return;

  const bytes = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(bytes, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rowsRaw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  if (rowsRaw.length === 0) return;

  const headers = Object.keys(rowsRaw[0]);
  const descKey = findDescriptionKey(headers) ?? headers[0];
  const qtyKey = findQuantityKey(headers) ?? headers[1] ?? null;

  const allProducts = await db.query.products.findMany();

  const rows: BoqRow[] = rowsRaw
    .map((r) => {
      const description = String(r[descKey] ?? "").trim();
      const quantityRaw = qtyKey ? r[qtyKey] : 1;
      const quantity = Number.parseInt(String(quantityRaw), 10);
      return {
        description,
        quantity: Number.isFinite(quantity) && quantity > 0 ? quantity : 1,
      };
    })
    .filter((r) => r.description.length > 0)
    .map((r) => {
      const tokens = tokenize(r.description);
      let best: { productId: string; score: number } | null = null;
      for (const p of allProducts) {
        const haystack = [p.name, p.category, p.collection, p.finish, p.woodSpecie, p.code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        const score = tokens.filter((t) => haystack.includes(t)).length;
        if (score > 0 && (!best || score > best.score)) {
          best = { productId: p.id, score };
        }
      }
      return {
        description: r.description,
        quantity: r.quantity,
        matchedProductId: best?.productId ?? null,
      };
    });

  const [upload] = await db
    .insert(boqUploads)
    .values({ architectUserId: user.id, filename: file.name, rows })
    .returning();

  redirect(`/architect/boq/${upload.id}`);
}

export async function generateRfqFromBoq(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const uploadId = String(formData.get("uploadId"));
  const upload = await db.query.boqUploads.findFirst({
    where: (u, { eq }) => eq(u.id, uploadId),
  });
  if (!upload || upload.architectUserId !== user.id) return;

  const mappedRows = upload.rows.filter((r) => r.matchedProductId);
  if (mappedRows.length === 0) return;

  const matchedProducts = await db.query.products.findMany({
    where: (p, { inArray }) =>
      inArray(p.id, mappedRows.map((r) => r.matchedProductId!)),
  });
  const productsById = new Map(matchedProducts.map((p) => [p.id, p]));

  const linesByManufacturer = new Map<string, { productId: string; quantity: number }[]>();
  for (const row of mappedRows) {
    const product = productsById.get(row.matchedProductId!);
    if (!product) continue;
    const list = linesByManufacturer.get(product.manufacturerId) ?? [];
    list.push({ productId: product.id, quantity: row.quantity });
    linesByManufacturer.set(product.manufacturerId, list);
  }

  if (linesByManufacturer.size === 0) return;

  const rfqId = linesByManufacturer.size > 1 ? randomUUID() : null;

  for (const [manufacturerId, lines] of linesByManufacturer) {
    const [enquiry] = await db
      .insert(enquiries)
      .values({
        architectUserId: user.id,
        manufacturerId,
        message: `RFQ generated from BOQ upload (${upload.filename ?? "uploaded file"}, ${lines.length} matched line item${lines.length > 1 ? "s" : ""}).`,
        type: "rfq",
        rfqId,
      })
      .returning();

    await db
      .insert(enquiryItems)
      .values(lines.map((l) => ({ enquiryId: enquiry.id, productId: l.productId, quantity: l.quantity })));
  }

  revalidatePath("/architect");
  redirect("/architect");
}
