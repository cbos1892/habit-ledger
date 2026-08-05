import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Habit Ledger",
  description: "A private, encouraging habit tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
