import type { Metadata } from "next";
import { Inter, Unbounded } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "700"],
});

const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  weight: ["400", "600"],
});

export const metadata: Metadata = {
  title: "JSTDRMN Academy",
  description: "Headliner membership, programs, and bootcamp cohort portals for JSTDRMN in Toronto.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${unbounded.variable} ${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
