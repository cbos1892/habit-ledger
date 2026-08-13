import type { Metadata } from "next";

import {
  Button,
  Card,
  CheckControl,
  Feedback,
  SelectField,
  TextAreaField,
  TextField,
} from "../../../components/ui";
import { requireTimeZoneContext } from "../../../lib/profile";
import styles from "./showcase.module.css";

export const metadata: Metadata = {
  title: "UI showcase",
  description:
    "Internal reference for Habit Ledger design tokens and primitives.",
};

const habitColors = ["fern", "ocean", "sun", "plum", "rose"] as const;

export default async function UiShowcasePage() {
  await requireTimeZoneContext();

  return (
    <section aria-labelledby="page-title" className={styles.showcase}>
      <div className="page-heading">
        <p className="page-eyebrow">Internal reference</p>
        <h1 className="page-title" id="page-title">
          UI showcase
        </h1>
        <p className="page-description">
          The shared visual language for clear, calm habit tracking. This page
          follows your system light or dark preference.
        </p>
      </div>

      <section aria-labelledby="foundation-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Foundation</p>
          <h2 id="foundation-title">Color and rhythm</h2>
          <p>
            Semantic feedback colors communicate state. Habit colors only
            identify habits, so meaning stays unambiguous.
          </p>
        </div>
        <Card>
          <div className={styles.swatches}>
            {habitColors.map((color) => (
              <div className={styles.swatchItem} key={color}>
                <span
                  aria-hidden="true"
                  className={styles.swatch}
                  data-color={color}
                />
                <span>{color}</span>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section aria-labelledby="actions-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Actions</p>
          <h2 id="actions-title">Buttons and cards</h2>
          <p>Variants share touch targets, focus treatment, and motion.</p>
        </div>
        <Card>
          <div className={styles.buttonRow}>
            <Button>Save habit</Button>
            <Button variant="secondary">Cancel</Button>
            <Button variant="ghost">View details</Button>
            <Button variant="danger">Archive</Button>
            <Button disabled>Saving…</Button>
          </div>
        </Card>
      </section>

      <section aria-labelledby="forms-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Inputs</p>
          <h2 id="forms-title">Form and check controls</h2>
          <p>
            Labels, descriptions, validation, and native semantics stay paired.
          </p>
        </div>
        <Card>
          <div className={styles.formGrid}>
            <TextField
              description="Use a short, encouraging name."
              id="habit-name"
              label="Habit name"
              placeholder="Morning walk"
            />
            <SelectField
              id="habit-color"
              label="Habit color"
              defaultValue="fern"
            >
              <option value="fern">Fern</option>
              <option value="ocean">Ocean</option>
              <option value="sun">Sun</option>
            </SelectField>
            <TextField
              error="Choose a valid time zone."
              id="time-zone"
              label="Time zone"
              defaultValue="Not a time zone"
            />
            <TextAreaField
              id="habit-notes"
              label="Notes"
              optional
              placeholder="Why this habit matters…"
            />
            <CheckControl
              defaultChecked
              description="The habit will appear in Today on this day."
              id="schedule-monday"
              label="Monday"
            />
            <CheckControl
              description="A disabled state remains readable and explicit."
              disabled
              id="schedule-sunday"
              label="Sunday"
            />
          </div>
        </Card>
      </section>

      <section aria-labelledby="feedback-title" className={styles.section}>
        <div className={styles.sectionHeading}>
          <p className={styles.kicker}>Feedback</p>
          <h2 id="feedback-title">Clear, restrained states</h2>
          <p>State is communicated by text and structure, never color alone.</p>
        </div>
        <div className={styles.feedbackGrid}>
          <Feedback title="Helpful context">
            Your week begins on Monday.
          </Feedback>
          <Feedback title="Habit saved" tone="success">
            Morning walk is ready for your next check-in.
          </Feedback>
          <Feedback title="Schedule needs attention" tone="warning">
            Choose at least one weekday.
          </Feedback>
          <Feedback title="Could not save" tone="danger">
            Your changes are still here. Try again in a moment.
          </Feedback>
        </div>
      </section>
    </section>
  );
}
