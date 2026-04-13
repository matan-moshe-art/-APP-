import type { Metadata } from "next";
import { Heebo } from "next/font/google";
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
      <body className="bg-mesh min-h-full font-sans text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
