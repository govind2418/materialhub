"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { enquiries, enquiryItems, moodBoardItems, projects } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function generateShareLink(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const projectId = String(formData.get("projectId"));
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
  });
  if (!project || project.architectUserId !== user.id) return;
  if (project.shareToken) return;

  const token = randomBytes(12).toString("hex");
  await db.update(projects).set({ shareToken: token }).where(eq(projects.id, projectId));

  revalidatePath("/architect");
}

export async function createProject(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const city = String(formData.get("city") ?? "").trim() || null;
  const budgetRaw = String(formData.get("budget") ?? "").trim();
  const budget = budgetRaw ? Number.parseInt(budgetRaw, 10) : null;

  await db.insert(projects).values({ architectUserId: user.id, name, city, budget });
  revalidatePath("/architect");
}

export async function removeFromMoodBoard(formData: FormData) {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const itemId = String(formData.get("itemId"));

  const item = await db.query.moodBoardItems.findFirst({
    where: (i, { eq }) => eq(i.id, itemId),
  });
  if (!item) return;

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.id, item.moodBoardId),
  });
  if (!board || board.architectUserId !== user.id) return;

  await db.delete(moodBoardItems).where(eq(moodBoardItems.id, itemId));

  revalidatePath("/architect");
}

export async function sendBoardEnquiry(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const moodBoardId = String(formData.get("moodBoardId"));
  const manufacturerId = String(formData.get("manufacturerId"));
  const message = String(formData.get("message") ?? "");

  const board = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.id, moodBoardId),
  });
  if (!board || board.architectUserId !== user.id) return;

  const items = await db.query.moodBoardItems.findMany({
    where: (i, { eq }) => eq(i.moodBoardId, board.id),
  });

  const products = await Promise.all(
    items.map((i) =>
      db.query.products.findFirst({ where: (p, { eq }) => eq(p.id, i.productId) })
    )
  );
  const productIds = products
    .filter((p) => p && p.manufacturerId === manufacturerId)
    .map((p) => p!.id);

  if (productIds.length === 0) return;

  const [enquiry] = await db
    .insert(enquiries)
    .values({
      architectUserId: user.id,
      manufacturerId,
      moodBoardId: board.id,
      message,
      type: "sample_request",
      sampleStatus: "requested",
    })
    .returning();

  await db
    .insert(enquiryItems)
    .values(productIds.map((productId) => ({ enquiryId: enquiry.id, productId })));

  revalidatePath("/architect");
}
