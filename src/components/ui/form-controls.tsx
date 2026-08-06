import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";

import { classNames } from "../../lib/class-names";
import styles from "./ui.module.css";

type FieldFrameProps = {
  children: React.ReactNode;
  description?: string;
  error?: string;
  id: string;
  label: string;
  optional?: boolean;
};

function FieldFrame({
  children,
  description,
  error,
  id,
  label,
  optional,
}: FieldFrameProps) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
        {optional ? <span className={styles.optional}>Optional</span> : null}
      </label>
      {children}
      {error ? (
        <p className={styles.error} id={`${id}-error`}>
          {error}
        </p>
      ) : description ? (
        <p className={styles.description} id={`${id}-description`}>
          {description}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, description?: string, error?: string) {
  if (error) return `${id}-error`;
  if (description) return `${id}-description`;
  return undefined;
}

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> &
  Omit<FieldFrameProps, "children">;

export function TextField({
  className,
  description,
  error,
  id,
  label,
  optional,
  ...props
}: TextFieldProps) {
  return (
    <FieldFrame {...{ description, error, id, label, optional }}>
      <input
        aria-describedby={describedBy(id, description, error)}
        aria-invalid={error ? true : undefined}
        className={classNames(styles.control, className)}
        id={id}
        {...props}
      />
    </FieldFrame>
  );
}

type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "id"> &
  Omit<FieldFrameProps, "children">;

export function SelectField({
  children,
  className,
  description,
  error,
  id,
  label,
  optional,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame {...{ description, error, id, label, optional }}>
      <select
        aria-describedby={describedBy(id, description, error)}
        aria-invalid={error ? true : undefined}
        className={classNames(styles.control, styles.select, className)}
        id={id}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

type TextAreaFieldProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "id"
> &
  Omit<FieldFrameProps, "children">;

export function TextAreaField({
  className,
  description,
  error,
  id,
  label,
  optional,
  ...props
}: TextAreaFieldProps) {
  return (
    <FieldFrame {...{ description, error, id, label, optional }}>
      <textarea
        aria-describedby={describedBy(id, description, error)}
        aria-invalid={error ? true : undefined}
        className={classNames(styles.control, styles.textarea, className)}
        id={id}
        {...props}
      />
    </FieldFrame>
  );
}
