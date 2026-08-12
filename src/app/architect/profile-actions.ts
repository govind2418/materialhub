"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getCurrentDbUser } from "@/lib/current-user";
import { db } from "@/db";
import { users, projects } from "@/db/schema";

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export async function updateProfileSettings(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const bio = String(formData.get("bio") ?? "").trim() || null;
  const publicProfileEnabled = formData.get("publicProfileEnabled") === "on";

  let publicSlug = user.publicSlug;
  if (publicProfileEnabled && !publicSlug) {
    publicSlug = `${slugify(user.name)}-${user.id.slice(0, 6)}`;
  }

  await db
    .update(users)
    .set({ bio, publicProfileEnabled, publicSlug })
    .where(eq(users.id, user.id));

  revalidatePath("/architect");
}

export async function toggleProjectPublic(formData: FormData): Promise<void> {
  const user = await getCurrentDbUser();
  if (!user || user.role !== "architect") return;

  const projectId = String(formData.get("projectId"));
  const project = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.id, projectId),
  });
  if (!project || project.architectUserId !== user.id) return;

  await db
    .update(projects)
    .set({ isPublicPortfolio: !project.isPublicPortfolio })
    .where(eq(projects.id, projectId));

  revalidatePath("/architect");
}
