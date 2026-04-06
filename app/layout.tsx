import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Providers } from "@/components/layout/Providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "FinPlan — Your Financial Operating System",
    template: "%s | FinPlan",
  },
  description:
    "India's most intelligent personal finance tool. Know your debt-free date, plan for life events, and grow wealth — all in one place.",
  keywords: ["financial planning", "India", "budget", "EMI", "SIP", "debt free", "net worth"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 text-gray-900 antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
