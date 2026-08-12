import { db } from "@/db";
import { computeEnquiryValues } from "./enquiry-value";
import { buildUpiIntentUrl, buildUpiQrDataUrl } from "./upi";

export type UpiPayment = { amount: number; upiUrl: string; qrDataUrl: string };

/**
 * Every unpaid, priced enquiry for a given user (architect order, retailer
 * restock, or any other buyer-side request) gets a "Pay via UPI" entry.
 * enquiries.architectUserId is the generic "requesting user" column across
 * every role that can request/order — not architects specifically.
 */
export async function getUnpaidUpiPayments(userId: string): Promise<Map<string, UpiPayment>> {
  const myEnquiries = await db.query.enquiries.findMany({
    where: (e, { eq }) => eq(e.architectUserId, userId),
  });
  if (myEnquiries.length === 0) return new Map();

  const enquiryValues = await computeEnquiryValues(myEnquiries.map((e) => e.id));

  const unpaid = myEnquiries.filter(
    (e) => e.paidStatus !== "paid" && (enquiryValues.get(e.id) ?? 0) > 0
  );

  const result = new Map<string, UpiPayment>();
  for (const e of unpaid) {
    const amount = enquiryValues.get(e.id)!;
    const upiUrl = buildUpiIntentUrl({ amount, note: `MaterialOS ${e.type} ${e.id.slice(0, 8)}` });
    if (!upiUrl) continue;
    const qrDataUrl = await buildUpiQrDataUrl(upiUrl);
    result.set(e.id, { amount, upiUrl, qrDataUrl });
  }
  return result;
}
