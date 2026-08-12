import { describe, it, expect, afterEach } from "vitest";
import { buildUpiIntentUrl } from "../src/lib/upi";

describe("buildUpiIntentUrl", () => {
  const originalVpa = process.env.UPI_VPA;
  const originalPayeeName = process.env.UPI_PAYEE_NAME;

  afterEach(() => {
    if (originalVpa === undefined) delete process.env.UPI_VPA;
    else process.env.UPI_VPA = originalVpa;
    if (originalPayeeName === undefined) delete process.env.UPI_PAYEE_NAME;
    else process.env.UPI_PAYEE_NAME = originalPayeeName;
  });

  it("returns null when no VPA is configured", () => {
    delete process.env.UPI_VPA;
    const url = buildUpiIntentUrl({ amount: 100, note: "test" });
    expect(url).toBeNull();
  });

  it("builds a valid upi://pay URL with the configured VPA and amount", () => {
    process.env.UPI_VPA = "test@upi";
    process.env.UPI_PAYEE_NAME = "Test Payee";
    const url = buildUpiIntentUrl({ amount: 1234.5, note: "order abc123" });

    expect(url).not.toBeNull();
    expect(url).toMatch(/^upi:\/\/pay\?/);
    const params = new URLSearchParams(url!.split("?")[1]);
    expect(params.get("pa")).toBe("test@upi");
    expect(params.get("pn")).toBe("Test Payee");
    expect(params.get("am")).toBe("1234.50");
    expect(params.get("cu")).toBe("INR");
    expect(params.get("tn")).toBe("order abc123");
  });

  it("defaults the payee name to MaterialOS when not configured", () => {
    process.env.UPI_VPA = "test@upi";
    delete process.env.UPI_PAYEE_NAME;
    const url = buildUpiIntentUrl({ amount: 500, note: "note" });
    const params = new URLSearchParams(url!.split("?")[1]);
    expect(params.get("pn")).toBe("MaterialOS");
  });
});
