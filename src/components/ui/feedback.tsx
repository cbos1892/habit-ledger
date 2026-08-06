import type { HTMLAttributes } from "react";

import { classNames } from "../../lib/class-names";
import styles from "./ui.module.css";

type FeedbackProps = HTMLAttributes<HTMLDivElement> & {
  title: string;
  tone?: "info" | "success" | "warning" | "danger";
};

export function Feedback({
  children,
  className,
  role,
  title,
  tone = "info",
  ...props
}: FeedbackProps) {
  return (
    <div
      className={classNames(
        styles.feedback,
        styles[`feedback-${tone}`],
        className,
      )}
      role={role ?? (tone === "danger" ? "alert" : "status")}
      {...props}
    >
      <span className={styles.feedbackMark} aria-hidden="true" />
      <div>
        <p className={styles.feedbackTitle}>{title}</p>
        {children ? (
          <div className={styles.feedbackCopy}>{children}</div>
        ) : null}
      </div>
    </div>
  );
}
