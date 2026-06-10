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
  title: "הבנת הודעות ובדיקת הונאה",
  description:
    "סיכום הודעות ובדיקת סיכון פישינג בעברית — הודעות קצרות, מסמכים ארוכים ו-PDF",
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
            <div className="flex min-h-full items-center justify-center p-8 text-sm text-zinc-500">
              טוען...
            </div>
          }
        >
          {children}
        </Suspense>
      </body>
    </html>
  );
}
