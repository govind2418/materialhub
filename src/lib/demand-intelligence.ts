import { db } from "@/db";

export type DemandTrends = {
  totalSearches: number;
  topCategories: { value: string; count: number }[];
  topFinishes: { value: string; count: number }[];
};

const ROLLING_WINDOW_DAYS = 30;

export async function getDemandTrends(): Promise<DemandTrends> {
  const since = new Date(Date.now() - ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db.query.searchLog.findMany({
    where: (s, { gte }) => gte(s.createdAt, since),
  });

  const categoryCounts = new Map<string, number>();
  const finishCounts = new Map<string, number>();
  for (const row of rows) {
    if (row.category) categoryCounts.set(row.category, (categoryCounts.get(row.category) ?? 0) + 1);
    if (row.finish) finishCounts.set(row.finish, (finishCounts.get(row.finish) ?? 0) + 1);
  }

  const topN = (counts: Map<string, number>, n: number) =>
    [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([value, count]) => ({ value, count }));

  return {
    totalSearches: rows.length,
    topCategories: topN(categoryCounts, 5),
    topFinishes: topN(finishCounts, 5),
  };
}

export async function getMostShortlistedFinishes(limit = 5): Promise<{ value: string; count: number }[]> {
  const items = await db.query.moodBoardItems.findMany();
  if (items.length === 0) return [];

  const products = await db.query.products.findMany();
  const finishByProductId = new Map(products.map((p) => [p.id, p.finish]));

  const counts = new Map<string, number>();
  for (const item of items) {
    const finish = finishByProductId.get(item.productId);
    if (!finish) continue;
    counts.set(finish, (counts.get(finish) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([value, count]) => ({ value, count }));
}

export async function getEmergingCategories(limit = 5): Promise<{ value: string; recentCount: number; priorCount: number }[]> {
  const now = Date.now();
  const windowMs = ROLLING_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const recentSince = new Date(now - windowMs / 2);
  const priorSince = new Date(now - windowMs);

  const rows = await db.query.searchLog.findMany({
    where: (s, { gte }) => gte(s.createdAt, priorSince),
  });

  const recentCounts = new Map<string, number>();
  const priorCounts = new Map<string, number>();
  for (const row of rows) {
    if (!row.category) continue;
    const bucket = row.createdAt >= recentSince ? recentCounts : priorCounts;
    bucket.set(row.category, (bucket.get(row.category) ?? 0) + 1);
  }

  const categories = new Set([...recentCounts.keys(), ...priorCounts.keys()]);
  const trends = [...categories].map((value) => ({
    value,
    recentCount: recentCounts.get(value) ?? 0,
    priorCount: priorCounts.get(value) ?? 0,
  }));

  return trends
    .filter((t) => t.recentCount > t.priorCount)
    .sort((a, b) => b.recentCount - b.priorCount - (a.recentCount - a.priorCount))
    .slice(0, limit);
}
