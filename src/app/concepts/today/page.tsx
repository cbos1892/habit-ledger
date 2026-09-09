import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";

import { TodayConcept } from "./today-concept";

const interfaceFont = Manrope({
  display: "swap",
  subsets: ["latin"],
  variable: "--concept-font-interface",
});

const editorialFont = Newsreader({
  axes: ["opsz"],
  display: "swap",
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--concept-font-editorial",
  weight: "variable",
});

export const metadata: Metadata = {
  title: "Today concept",
  description: "An isolated visual prototype for the Habit Ledger redesign.",
  robots: {
    follow: false,
    index: false,
  },
};

export default function TodayConceptPage() {
  return (
    <TodayConcept
      className={`${interfaceFont.variable} ${editorialFont.variable}`}
    />
  );
}
