import type { ButtonHTMLAttributes } from "react";

import { classNames } from "../../lib/class-names";
import styles from "./ui.module.css";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "small" | "medium";
};

export function Button({
  className,
  size = "medium",
  type = "button",
  variant = "primary",
  ...props
}: ButtonProps) {
  return (
    <button
      className={classNames(
        styles.button,
        styles[`button-${variant}`],
        styles[`button-${size}`],
        className,
      )}
      type={type}
      {...props}
    />
  );
}
