import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import Navbar from "@/components/Navbar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Distinctive serif display face — institutional authority with a modern edge.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["opsz"],
});

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://majormaestro.com";

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  title: {
    default: "MajorGBN — Forensic Bank Charge Recovery for Nigerian Corporates",
    template: "%s · MajorGBN",
  },
  description:
    "MajorGBN runs forensic audits of corporate bank accounts to recover illegitimate charges — excess interest, COT and LC deductions — benchmarked against the CBN Guide to Bank Charges and BOFIA Act. Zero-risk: 30% success fee, charged only on recovery.",
  keywords: [
    "bank charge recovery Nigeria",
    "excess bank charges",
    "COT recovery",
    "CBN Guide to Bank Charges",
    "BOFIA Act",
    "forensic financial audit",
    "corporate bank refund",
  ],
  applicationName: "MajorGBN",
  openGraph: {
    type: "website",
    siteName: "MajorGBN",
    url: APP_URL,
    title: "Recover What Your Bank Owes You — MajorGBN Forensic Recovery",
    description:
      "Forensic audits that recover excess interest, COT and LC charges from Nigerian banks. No recovery, no fee.",
  },
  twitter: {
    card: "summary_large_image",
    title: "MajorGBN — Forensic Bank Charge Recovery",
    description:
      "Forensic audits that recover excess bank charges for Nigerian corporates. No recovery, no fee.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-slate-50 text-ink">
        <Navbar />
        <main className="flex flex-1 flex-col">{children}</main>
        <Analytics />
      </body>
    </html>
  );
}
