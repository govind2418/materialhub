import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "../src/db";
import { users, premiumMemberships, communityMessages } from "../src/db/schema";
import { isMembershipActive, getLatestMembership } from "../src/lib/premium";
import { insertUser } from "./helpers";

describe("isMembershipActive", () => {
  it("is false for null/undefined", () => {
    expect(isMembershipActive(null)).toBe(false);
    expect(isMembershipActive(undefined)).toBe(false);
  });

  it("is false when status isn't active", () => {
    expect(isMembershipActive({ status: "pending", expiresAt: new Date(Date.now() + 100000) })).toBe(false);
    expect(isMembershipActive({ status: "expired", expiresAt: new Date(Date.now() + 100000) })).toBe(false);
  });

  it("is false when active but expiresAt has passed", () => {
    expect(isMembershipActive({ status: "active", expiresAt: new Date(Date.now() - 1000) })).toBe(false);
  });

  it("is true when active and expiresAt is in the future", () => {
    expect(isMembershipActive({ status: "active", expiresAt: new Date(Date.now() + 100000) })).toBe(true);
  });

  it("is false when active but expiresAt is null", () => {
    expect(isMembershipActive({ status: "active", expiresAt: null })).toBe(false);
  });
});

describe("Architect Circle membership lifecycle (real DB)", () => {
  const suffix = `vitest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  let architectId: string;
  let membershipId: string;

  beforeAll(async () => {
    const architect = await insertUser({ clerkId: `${suffix}-arch`, role: "architect", name: "Vitest Architect", email: `${suffix}@example.com` });
    architectId = architect.id;

    const [membership] = await db
      .insert(premiumMemberships)
      .values({ userId: architectId, amount: 50000 })
      .returning();
    membershipId = membership.id;
  });

  afterAll(async () => {
    await db.delete(communityMessages).where(eq(communityMessages.userId, architectId));
    await db.delete(premiumMemberships).where(eq(premiumMemberships.id, membershipId));
    await db.delete(users).where(eq(users.id, architectId));
  });

  it("starts as pending and is not active", async () => {
    const membership = await getLatestMembership(architectId);
    expect(membership?.status).toBe("pending");
    expect(isMembershipActive(membership)).toBe(false);
  });

  it("becomes active once an admin sets status + a future expiry (simulating activatePremiumMembership)", async () => {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    await db
      .update(premiumMemberships)
      .set({ status: "active", activatedAt: new Date(), expiresAt })
      .where(eq(premiumMemberships.id, membershipId));

    const membership = await getLatestMembership(architectId);
    expect(isMembershipActive(membership)).toBe(true);
  });

  it("getLatestMembership returns the most recent request when there are several", async () => {
    const [olderMembership] = await db
      .insert(premiumMemberships)
      .values({ userId: architectId, amount: 50000, status: "rejected", requestedAt: new Date(Date.now() - 1000000) })
      .returning();

    const latest = await getLatestMembership(architectId);
    expect(latest?.id).toBe(membershipId); // the active one, requested more recently
    expect(latest?.id).not.toBe(olderMembership.id);

    await db.delete(premiumMemberships).where(eq(premiumMemberships.id, olderMembership.id));
  });
});
