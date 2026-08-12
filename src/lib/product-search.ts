import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";

const SEARCH_EXPR = sql`lower(
  coalesce(${products.name}, '') || ' ' ||
  coalesce(${products.code}, '') || ' ' ||
  coalesce(${products.category}, '') || ' ' ||
  coalesce(${products.finish}, '') || ' ' ||
  coalesce(${products.collection}, '') || ' ' ||
  coalesce(${products.woodSpecie}, '')
)`;

/**
 * Typo-tolerant catalog search using Postgres's pg_trgm extension — no
 * external search service. A product matches if the query is a plain
 * substring anywhere in its searchable text, OR its trigram similarity to
 * the query clears a threshold (catches minor typos/misspellings). Results
 * are ranked by similarity, so closer matches surface first.
 */
export async function searchProducts(filters: {
  category?: string;
  collection?: string;
  finish?: string;
  query?: string;
}) {
  const conditions = [];
  if (filters.category) conditions.push(eq(products.category, filters.category));
  if (filters.collection) conditions.push(eq(products.collection, filters.collection));
  if (filters.finish) conditions.push(eq(products.finish, filters.finish));

  const trimmedQuery = filters.query?.trim().toLowerCase();
  if (!trimmedQuery) {
    return db.query.products.findMany({
      where: conditions.length ? and(...conditions) : undefined,
      orderBy: (p, { asc }) => asc(p.name),
    });
  }

  conditions.push(
    sql`(${SEARCH_EXPR} ILIKE ${"%" + trimmedQuery + "%"} OR word_similarity(${trimmedQuery}, ${SEARCH_EXPR}) > 0.4)`
  );

  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(sql`word_similarity(${trimmedQuery}, ${SEARCH_EXPR}) DESC`);
}
