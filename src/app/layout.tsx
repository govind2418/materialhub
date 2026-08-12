import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz", "SOFT", "WONK"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://material-hub-rho.vercel.app"),
  title: {
    default: "MaterialOS — Find the exact finish you're picturing",
    template: "%s — MaterialOS",
  },
  description:
    "MaterialOS connects manufacturers with architects and designers — search visually, build mood boards, and enquire directly with verified material suppliers.",
  openGraph: {
    type: "website",
    siteName: "MaterialOS",
    title: "MaterialOS — Find the exact finish you're picturing",
    description:
      "Search materials visually, build mood boards, and connect directly with verified manufacturers and distributors.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MaterialOS",
    description:
      "Search materials visually, build mood boards, and connect directly with verified manufacturers and distributors.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-neutral-50 text-neutral-900">
        <ClerkProvider
          appearance={{
            variables: {
              colorPrimary: "#b5563c",
              colorBackground: "#ffffff",
              colorForeground: "#2b221c",
              colorMutedForeground: "#6b5d4f",
              colorInput: "#ffffff",
              colorInputForeground: "#2b221c",
              borderRadius: "0.75rem",
              fontFamily: "var(--font-geist-sans)",
            },
          }}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
