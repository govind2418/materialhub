import { db } from "@/db";
import { moodBoards, projects } from "@/db/schema";

export async function getOrCreateActiveProject(architectUserId: string) {
  const existing = await db.query.projects.findFirst({
    where: (p, { eq }) => eq(p.architectUserId, architectUserId),
    orderBy: (p, { desc }) => desc(p.createdAt),
  });
  if (existing) return existing;

  const [project] = await db
    .insert(projects)
    .values({ architectUserId, name: "My First Project" })
    .returning();
  return project;
}

export async function getOrCreateProjectBoard(projectId: string, architectUserId: string) {
  const existing = await db.query.moodBoards.findFirst({
    where: (b, { eq }) => eq(b.projectId, projectId),
  });
  if (existing) return existing;

  const [board] = await db
    .insert(moodBoards)
    .values({ architectUserId, projectId, name: "Shortlist" })
    .returning();
  return board;
}
