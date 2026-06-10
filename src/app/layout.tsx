import type { Metadata } from "next";
import { Heebo } from "next/font/google";
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
        {children}
      </body>
    </html>
  );
}
