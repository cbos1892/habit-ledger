# R1 functional testing

The R1 Playwright suite covers the authenticated Today and Setup paths that are
most sensitive to browser behavior:

- keyboard completion and undo with refresh persistence;
- optimistic rollback after a failed write;
- accessible Today semantics and automated structural checks;
- 320 px overflow checks for Today, Setup, and the habit form;
- keyboard schedule editing and empty-schedule validation.

The suite reuses the dedicated test-account authentication fixture documented
in [navigation-performance.md](./navigation-performance.md). Use a non-personal
account with representative daily and selected-weekday habits. Keep its
credentials and generated storage state outside Git.

```sh
R1_E2E_BASE_URL=https://your-preview.example \
NAV_PERF_SUPABASE_URL=https://your-project.supabase.co \
NAV_PERF_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
NAV_PERF_EMAIL=r1-test@example.com \
NAV_PERF_PASSWORD='managed-outside-git' \
pnpm test:r1-e2e
```

Install the bundled browser once on a new machine with
`pnpm test:nav-perf:install`.

The Today persistence test always returns the selected habit to its original
completion state. The empty-schedule Setup test stops at validation and does not
create a habit.
