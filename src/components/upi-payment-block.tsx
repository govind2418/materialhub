import type { UpiPayment } from "@/lib/upi-payments";

export function UpiPaymentBlock({ payment }: { payment: UpiPayment }) {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-4 rounded-lg border border-terracotta-200 bg-terracotta-50 p-3">
      {/* eslint-disable-next-line @next/next/no-img-element -- small locally-generated data: URL, next/image adds no value here */}
      <img src={payment.qrDataUrl} alt="UPI payment QR code" className="h-24 w-24 shrink-0 rounded bg-white p-1" />
      <div>
        <p className="text-sm font-medium text-terracotta-800">
          Pay ₹{payment.amount.toLocaleString("en-IN")} via UPI
        </p>
        <p className="mt-0.5 text-xs text-terracotta-700">
          Scan the QR from any UPI app, or{" "}
          <a href={payment.upiUrl} className="underline">
            tap to pay on mobile
          </a>
          . We&apos;ll confirm and mark this paid manually after receiving it.
        </p>
      </div>
    </div>
  );
}
