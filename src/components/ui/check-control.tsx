import type { InputHTMLAttributes } from "react";

import { classNames } from "../../lib/class-names";
import styles from "./ui.module.css";

type CheckControlProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "id" | "type"
> & {
  description?: string;
  id: string;
  label: string;
};

export function CheckControl({
  className,
  description,
  id,
  label,
  ...props
}: CheckControlProps) {
  return (
    <div className={styles.checkRow}>
      <input
        aria-describedby={description ? `${id}-description` : undefined}
        className={classNames(styles.checkbox, className)}
        id={id}
        type="checkbox"
        {...props}
      />
      <div>
        <label className={styles.checkLabel} htmlFor={id}>
          {label}
        </label>
        {description ? (
          <p className={styles.checkDescription} id={`${id}-description`}>
            {description}
          </p>
        ) : null}
      </div>
    </div>
  );
}
