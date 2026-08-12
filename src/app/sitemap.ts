import type { MetadataRoute } from "next";
import { db } from "@/db";

const BASE_URL = "https://material-hub-rho.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, manufacturers, publicArchitects, guides] = await Promise.all([
    db.query.products.findMany({ columns: { slug: true, updatedAt: true } }),
    db.query.manufacturers.findMany({ columns: { slug: true } }),
    db.query.users.findMany({
      where: (u, { eq }) => eq(u.publicProfileEnabled, true),
      columns: { publicSlug: true },
    }),
    db.query.guides.findMany({
      where: (g, { eq }) => eq(g.published, true),
      columns: { slug: true, createdAt: true },
    }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${BASE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${BASE_URL}/catalog`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE_URL}/catalog/find-alternative`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/market-insights`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE_URL}/learn`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${BASE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];

  const productRoutes: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${BASE_URL}/catalog/${p.slug}`,
    lastModified: p.updatedAt,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const manufacturerRoutes: MetadataRoute.Sitemap = manufacturers.map((m) => ({
    url: `${BASE_URL}/manufacturers/${m.slug}`,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const architectRoutes: MetadataRoute.Sitemap = publicArchitects
    .filter((a) => a.publicSlug)
    .map((a) => ({
      url: `${BASE_URL}/architects/${a.publicSlug}`,
      changeFrequency: "monthly",
      priority: 0.4,
    }));

  const guideRoutes: MetadataRoute.Sitemap = guides.map((g) => ({
    url: `${BASE_URL}/learn/${g.slug}`,
    lastModified: g.createdAt,
    changeFrequency: "monthly",
    priority: 0.5,
  }));

  return [...staticRoutes, ...productRoutes, ...manufacturerRoutes, ...architectRoutes, ...guideRoutes];
}
