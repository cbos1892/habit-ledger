# Authenticated navigation performance

The Playwright benchmark measures signed-in client navigation between Today,
Week, Stats, and Setup against a deployed preview or production environment. It
keeps cold (browser cache disabled) and warm (cache primed) samples separate and
writes JSON plus Markdown reports to `artifacts/navigation-performance/`.

## Secure authentication fixture

Use a dedicated, non-personal test account with representative habits and a
confirmed time zone. Do not commit its password, access token, refresh token, or
Playwright storage state. `.auth/` and generated artifacts are ignored by Git.

The preferred local and CI setup signs in programmatically with environment
variables:

```sh
NAV_PERF_BASE_URL=https://your-preview.example \
NAV_PERF_SUPABASE_URL=https://your-project.supabase.co \
NAV_PERF_SUPABASE_PUBLISHABLE_KEY=sb_publishable_... \
NAV_PERF_EMAIL=performance-test@example.com \
NAV_PERF_PASSWORD='managed-outside-git' \
pnpm test:nav-perf
```

The Supabase publishable key is public application configuration. The account
password is a secret and belongs only in a password manager, local untracked
environment, or CI secret store.

As an alternative, provide a base64-encoded Playwright storage-state JSON in
`NAV_PERF_STORAGE_STATE_B64`. This is session material and must be handled as a
secret. The setup writes it to `.auth/navigation-performance.json` with
owner-only permissions before the test and never prints it.

Install the bundled Chromium browser once on a new machine:

```sh
pnpm test:nav-perf:install
```

## Results and conditions

The benchmark defaults to five repetitions of every route in each run type.
Override that with `NAV_PERF_SAMPLES`. Each sample records:

- click-to-first-visible-feedback and click-to-destination-heading;
- same-origin server request count and Supabase request count;
- cumulative layout shift, latest LCP, Event Timing interaction duration, and
  long-task count/duration where Chromium exposes those entry types.

Run against a stable deployment, from a consistent runner region, without
DevTools throttling. Record the deployment commit, runner location, account data
shape, sample count, and generated report on the performance epic before using
results to judge an optimization.

## Advisory regression tolerance

The initial warm click-to-content p75 tolerance is 1500 ms. Change it with
`NAV_PERF_MAX_P75_CONTENT_MS`. Thresholds are advisory by default while the
project gathers stable samples; set `NAV_PERF_ENFORCE_THRESHOLDS=1` only after a
reviewed baseline establishes a reliable failure boundary.

The manual/workflow-call GitHub Action is suitable for a post-deploy job. It
stores the generated report as a workflow artifact and uses repository secrets
for the test account. It does not run on untrusted pull-request code where those
secrets would be exposed.
