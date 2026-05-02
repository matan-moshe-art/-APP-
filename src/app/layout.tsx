import type { Metadata } from "next";
import { Heebo } from "next/font/google";
import { Suspense } from "react";
import "./globals.css";

const heebo = Heebo({
  subsets: ["hebrew", "latin"],
  variable: "--font-heebo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "מנתח הודעות רשמיות",
  description:
    "הדביקו הודעה רשמית וקבלו הסבר פשוט, רמת דחיפות, מה לעשות, ומה חשוד",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="bg-mesh-dark min-h-full font-sans text-zinc-100 antialiased">
        <Suspense
          fallback={
            <div className="flex min-h-full items-center justify-center p-8">
              <div
                className="size-10 animate-pulse rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 opacity-80"
                aria-hidden
              />
            </div>
          }
        >
          {children}
        </Suspense>
      </body>
    </html>
  );
}
