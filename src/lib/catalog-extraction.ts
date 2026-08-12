import { generateObject } from "ai";
import { z } from "zod";
import type { ExtractedProduct } from "@/db/schema";

const extractionSchema = z.object({
  products: z.array(
    z.object({
      name: z.string().describe("Product name as printed in the catalog"),
      code: z.string().nullable().describe("Product/SKU code, e.g. LIS-60"),
      collection: z.string().nullable().describe("Collection or series name"),
      category: z.string().nullable().describe("e.g. Veneer, Laminate, Decorative Panel"),
      woodSpecie: z.string().nullable().describe("e.g. Walnut, White Oak"),
      veneerThickness: z.string().nullable().describe("e.g. 0.6mm, 5mm — only if explicitly stated"),
      base: z.string().nullable().describe("Backing/base material, e.g. 'Imported Plywood MR Grade'"),
      finish: z.string().nullable().describe("e.g. Matte, Textured, Fluted, Fine Sanded"),
      flexibility: z.string().nullable().describe("e.g. 'Bendable with paper backing', only if stated"),
      weightPerPanel: z.string().nullable().describe("e.g. '22-25kgs', only if stated"),
      panelSizes: z.array(z.string()).nullable().describe("Panel dimensions if listed, e.g. ['2440x1220mm']"),
      pricePerSheet: z.number().nullable().describe("Price per sheet in INR, only if explicitly printed"),
      certifications: z.array(z.string()).nullable().describe("e.g. ['FSC', 'E1']"),
      fireRating: z.string().nullable(),
      moistureResistance: z.string().nullable().describe("Low, Standard, or High, only if stated"),
      maintenanceLevel: z.string().nullable().describe("Low, Medium, or High, only if stated"),
    })
  ),
});

export async function extractProductsFromCatalog(
  file: Buffer,
  mediaType: string
): Promise<ExtractedProduct[]> {
  const { object } = await generateObject({
    model: "anthropic/claude-sonnet-4.5",
    schema: extractionSchema,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `You are digitizing a manufacturer's product catalog (veneers, laminates, or decorative panels) into structured records. Extract every distinct product you can find. Only fill a field if the catalog actually states it — use null rather than guessing. Do not invent prices, codes, or certifications that aren't printed. If the same product appears with size/finish variants, list each as a separate product only if they have distinct codes; otherwise treat as one product.`,
          },
          {
            type: "file",
            data: file,
            mediaType,
          },
        ],
      },
    ],
  });

  return object.products;
}
