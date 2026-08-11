import "dotenv/config";
import { readFileSync } from "fs";
import { db } from "./index";
import { manufacturers, products } from "./schema";

type SeedProduct = {
  slug: string;
  name: string;
  code: string | null;
  image: string;
  manufacturer: string;
  collection: string;
  category: string;
  wood_specie: string;
  veneer_thickness: string;
  base: string;
  weight_per_panel: string;
  finish: string;
  flexibility: string | null;
  panel_sizes: string[];
};

async function main() {
  const seedProducts: SeedProduct[] = JSON.parse(
    readFileSync("./seed-products.json", "utf-8")
  );

  const [manufacturer] = await db
    .insert(manufacturers)
    .values({
      slug: "leela-infra-solution",
      name: "Leela Infra Solution",
      contactName: "Askaran Sharma",
      contactPhone: "+91 93214 95610",
      description: "Veneers & Wooden Panels manufacturer.",
    })
    .onConflictDoNothing({ target: manufacturers.slug })
    .returning();

  const manufacturerRow =
    manufacturer ??
    (
      await db.query.manufacturers.findFirst({
        where: (m, { eq }) => eq(m.slug, "leela-infra-solution"),
      })
    )!;

  for (const p of seedProducts) {
    await db
      .insert(products)
      .values({
        slug: p.slug,
        manufacturerId: manufacturerRow.id,
        name: p.name,
        code: p.code,
        collection: p.collection,
        category: p.category,
        woodSpecie: p.wood_specie,
        veneerThickness: p.veneer_thickness,
        base: p.base,
        finish: p.finish,
        flexibility: p.flexibility,
        weightPerPanel: p.weight_per_panel,
        panelSizes: p.panel_sizes,
        imageUrl: p.image,
      })
      .onConflictDoNothing({ target: products.slug });
  }

  console.log(`Seeded manufacturer + ${seedProducts.length} products`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
