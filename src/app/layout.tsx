import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { DM_Sans, DM_Serif_Display } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap"
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-dm-serif",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Kompendium Terapeutyczne — Wszystkie zaburzenia i podejścia",
  description:
    "Kompendium interwencji CBT, DBT, ACT i nie tylko — handouty, instrukcje i farmakoterapia."
};

type RootLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function RootLayout({ children }: RootLayoutProps) {
  return (
    <ClerkProvider>
      <html lang="pl" className={`${dmSans.variable} ${dmSerif.variable}`}>
        <body className={`${dmSans.className} antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  );
}
