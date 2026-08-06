import type { HTMLAttributes } from "react";

import { classNames } from "../../lib/class-names";
import styles from "./ui.module.css";

type CardProps = HTMLAttributes<HTMLDivElement> & {
  padding?: "compact" | "comfortable";
};

export function Card({
  className,
  padding = "comfortable",
  ...props
}: CardProps) {
  return (
    <div
      className={classNames(styles.card, styles[`card-${padding}`], className)}
      {...props}
    />
  );
}
