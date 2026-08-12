import QRCode from "qrcode";

export function isUpiConfigured(): boolean {
  return !!process.env.UPI_VPA;
}

export function buildUpiIntentUrl({ amount, note }: { amount: number; note: string }): string | null {
  const vpa = process.env.UPI_VPA;
  if (!vpa) return null;
  const payeeName = process.env.UPI_PAYEE_NAME || "MaterialOS";

  const params = new URLSearchParams({
    pa: vpa,
    pn: payeeName,
    am: amount.toFixed(2),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export async function buildUpiQrDataUrl(upiUrl: string): Promise<string> {
  return QRCode.toDataURL(upiUrl, { margin: 1, width: 220 });
}
