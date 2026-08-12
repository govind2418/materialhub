import { db } from "@/db";

export type ResponseTimeStats = {
  respondedCount: number;
  totalCount: number;
  avgHours: number | null;
};

export async function getResponseTimeStats(manufacturerId: string): Promise<ResponseTimeStats> {
  const enquiries = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.manufacturerId, manufacturerId),
  });

  const responded = enquiries.filter((e) => e.lastContactedAt);
  const hoursList = responded.map(
    (e) => (new Date(e.lastContactedAt!).getTime() - new Date(e.createdAt).getTime()) / (1000 * 60 * 60)
  );

  return {
    respondedCount: responded.length,
    totalCount: enquiries.length,
    avgHours: hoursList.length > 0 ? hoursList.reduce((s, v) => s + v, 0) / hoursList.length : null,
  };
}

export function formatResponseTime(hours: number): string {
  if (hours < 1) return "under an hour";
  if (hours < 24) return `~${Math.round(hours)} hour${Math.round(hours) === 1 ? "" : "s"}`;
  return `~${Math.round(hours / 24)} day${Math.round(hours / 24) === 1 ? "" : "s"}`;
}
