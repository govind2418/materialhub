import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";

export async function getCurrentDbUser() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await db.query.users.findFirst({
    where: (u, { eq }) => eq(u.clerkId, userId),
  });
  return user ?? null;
}
