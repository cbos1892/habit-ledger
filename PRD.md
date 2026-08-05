# Habit Ledger — Product Requirements Document

## Overview

Habit Ledger is a private, mobile-friendly habit tracker designed to make daily check-ins fast and weekly progress easy to understand. It is also a practice project for learning the complete lifecycle of designing, building, securing, and deploying a polished web application.

The product should remain focused, pleasant to use, and small enough to finish.

## Product goals

1. Let users create binary habits and choose the weekdays on which each habit is scheduled.
2. Make completing today's habits a quick, low-friction flow that takes only seconds.
3. Provide a clear seven-day grid for reviewing and editing weekly progress.
4. Keep each user's habit and completion data private and secure.
5. Preserve historical data when habits are archived.
6. Deliver a polished responsive web experience that can grow into a PWA.

## Target user

The initial product is for an individual who wants a simple, encouraging way to track recurring habits without punitive streak mechanics or an overly complex setup process.

## R1 — Private MVP

The first release should include:

- A responsive application shell and reusable design system.
- Passwordless authentication, session handling, and profile onboarding.
- User time-zone settings and local-calendar-date behavior.
- Habit creation and editing with weekday schedules, icons, colors, and validation.
- Habit reordering, archiving, and restoration without deleting completion history.
- A Today view showing scheduled habits and daily progress.
- Fast completion toggles with optimistic feedback and undo.
- A responsive seven-day habit grid with week navigation and direct cell editing.
- Secure data ownership enforced with Supabase row-level security.
- Automated checks for core behavior, accessibility, privacy, and date-boundary edge cases.
- Preview and production deployment through Vercel.

R1 supports completed/incomplete habits only. Count-based and duration-based goals are deferred to a later release.

## Experience principles

- Design mobile-first.
- Keep the Today check-in path immediate and uncluttered.
- Treat the weekly grid as the signature visual payoff.
- Use encouraging language and restrained celebration.
- Keep notes optional and outside the critical check-in flow.
- Treat the user's IANA time zone and local calendar date as first-class data.
- Archive rather than delete habits so history remains intact.

## Technical direction

- **Frontend:** Next.js and TypeScript
- **Backend:** Supabase Authentication and Postgres
- **Authorization:** Supabase row-level security; never rely only on client-side checks
- **Hosting:** Vercel
- **Distribution:** Responsive web app or PWA; no app-store release is planned
- **Security:** Never expose Supabase service-role credentials in browser code

## Later releases

### R2 — Insights & Polish

- Statistics, trends, and progress insights
- Mobile PWA behavior and accessibility improvements
- Notes and completion history
- Themes and delightful feedback

### R3 — Flexible & Delightful

- Count and duration goal types
- Reminders and gentle nudges
- Deeper insights and reflection
- Data portability and privacy controls

## Success criteria

- A user can securely sign in and access only their own data.
- A user can create, schedule, edit, reorder, archive, and restore a habit.
- Today's scheduled habits are calculated correctly in the user's time zone.
- A completion can be recorded or undone quickly from Today and Week views.
- The weekly grid clearly distinguishes completed, incomplete, and unscheduled dates.
- Archived habits disappear from active views while retaining their history.
- Core flows work on mobile screens and with keyboard or assistive input.
- The application can be deployed reliably to preview and production environments.

## Non-goals for R1

- Native iOS or Android applications
- Social feeds, sharing, competitions, or leaderboards
- Count, duration, or other flexible goal types
- Push reminders
- Advanced analytics
- Punitive streak-loss mechanics

## Planning and source of truth

Implementation work is organized in Notion as **Releases → Epics → Tasks**. Notion remains the source of truth for roadmap status, priority, estimates, task acceptance criteria, and target dates.

- [Habit Tracker App project](https://app.notion.com/p/3b3ba7af1f5a80ec870efc5cdbc9b121)
- [Project agent instructions](https://app.notion.com/p/3b3ba7af1f5a80c99ec7fa079b12f8b8)

This PRD summarizes the Notion project as reviewed on August 5, 2026. When this document and Notion differ, verify the current Notion records before making planning decisions.
