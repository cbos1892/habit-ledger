import type { Metadata } from "next";
import Script from "next/script";

import { ThemeSynchronizer } from "@/components/theme/theme-synchronizer";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Habit Ledger",
    template: "%s | Habit Ledger",
  },
  description: "A private, encouraging habit tracker.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      data-palette="coffeehouse"
      data-theme="light"
      lang="en"
      suppressHydrationWarning
    >
      <body>
        <Script id="appearance-preference" strategy="beforeInteractive">
          {`try {
            var preference = localStorage.getItem("habit-ledger:appearance");
            if (preference !== "light" && preference !== "dark" && preference !== "system") preference = "system";
            var theme = preference === "system"
              ? (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
              : preference;
            document.documentElement.dataset.appearance = preference;
            document.documentElement.dataset.theme = theme;
          } catch (_) {}`}
        </Script>
        <ThemeSynchronizer />
        {children}
      </body>
    </html>
  );
}
