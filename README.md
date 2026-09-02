# Habit Ledger

Habit Ledger is a private, mobile-friendly habit tracker. See [PRD.md](./PRD.md) for the product goals and release scope.

## Current infrastructure

- GitHub repository: `cbos1892/habit-ledger`
- Production branch: `main`
- Supabase project: `Habit-Ledger`
- Supabase project reference: `jlxfxysadkbzcfpdjttq`
- Supabase region: West US (Oregon)
- Vercel project: `curtis-s-team/habit-ledger`
- Production URL: [habitledger.vercel.app](https://habitledger.vercel.app/)

The checked-in Supabase migrations include user-owned profiles, habits, weekday schedules, and one daily completion per habit and local calendar date. All application tables enforce ownership with row-level security.

## Prerequisites

- Git
- Node.js 24
- pnpm 11
- Supabase CLI
- A Docker-compatible runtime when running Supabase locally

Install the Supabase CLI on macOS:

```sh
brew install supabase/tap/supabase
```

Install pnpm if it is not already available:

```sh
npm install --global pnpm@11.9.0
```

## Initial setup

```sh
git clone https://github.com/cbos1892/habit-ledger.git
cd habit-ledger
pnpm install
cp .env.example .env.local
supabase login
supabase link --project-ref jlxfxysadkbzcfpdjttq
```

Get the publishable key from the Supabase dashboard's **Connect** dialog and place it in `.env.local`. The project URL and publishable key are designed for browser use; database passwords, personal access tokens, secret keys, and legacy service-role keys are privileged and must remain outside Git.

The typed client helpers validate both required public variables before creating a client:

- Use `createBrowserSupabaseClient()` from `src/lib/supabase/client.ts` in Client Components and other browser code.
- Use `await createServerSupabaseClient()` from `src/lib/supabase/server.ts` in Server Components, Server Actions, and Route Handlers. Create a fresh server client for each request.

Both helpers use the generated `Database` type in `src/types/database.ts`. The browser helper contains only the publishable key; do not add a secret or service-role client to browser-importable modules.

Server-side features should use `getCurrentUser()` or `requireCurrentUser()` from `src/lib/auth/current-user.ts` before reading user-owned data. These helpers verify the access token with `supabase.auth.getClaims()` and expose only its stable `sub` user ID, keeping authorization decisions and private user objects out of Client Components. With this project's asymmetric signing key, verification uses the cached Supabase JWKS instead of calling the Auth user endpoint on every request. Use `getUser()` only when code genuinely needs the latest Auth user record or an explicit server-side session/revocation check; do not use unverified `getSession()` user data for authorization.

Authentication uses Google OAuth and Supabase passwordless email links with PKCE. Google is the primary sign-in option and email remains available as a fallback. The production, current branch-preview, localhost, and loopback callback URLs are declared in `supabase/config.toml`; push reviewed Auth configuration changes with `supabase config push`. Requests refresh and verify their SSR session through `src/proxy.ts` with `getClaims()`, propagating rotated cookies to both Server Components and the browser before protected layouts render. See [docs/google-oauth.md](./docs/google-oauth.md) for the one-time Google Cloud and Supabase provider setup; OAuth client secrets must stay in those provider settings and out of Git.

Each Auth user receives one `profiles` row automatically. Profile reads and time-zone updates are protected by row-level security, and the database accepts only time-zone names recognized by PostgreSQL's IANA time-zone catalog. Application validation should still reject invalid values before submitting them so users receive immediate feedback.

## Environment variables

The application requires these variables in every runtime environment:

| Variable                               | Local development | Vercel Preview             | Vercel Production          |
| -------------------------------------- | ----------------- | -------------------------- | -------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`             | `.env.local`      | Vercel environment setting | Vercel environment setting |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local`      | Vercel environment setting | Vercel environment setting |
| `TIME_ZONE_COOKIE_SECRET`              | `.env.local`      | Vercel environment setting | Vercel environment setting |

Use `.env.example` only as a safe template. Do not commit `.env.local` or any real privileged credential. If a server-only secret becomes necessary later, configure it only in `.env.local` and the appropriate hosted environment, never with a `NEXT_PUBLIC_` prefix.

`TIME_ZONE_COOKIE_SECRET` signs the HTTP-only, user-bound time-zone cache used by server rendering. Generate an independent value with `openssl rand -base64 32`; do not reuse a Supabase key. If it is missing, too short, or rotated, the application safely falls back to the profile until a valid cookie can be issued.

Preview and production intentionally use the same hosted Supabase project for the private MVP. The variables are explicitly scoped to both Vercel environments. Introduce separate Supabase projects and environment-specific values before this shared-backend tradeoff is no longer appropriate.

## Local Supabase workflow

Start the local stack and apply all migrations and seed data:

```sh
supabase start
supabase db reset
```

Stop the local stack without discarding its data:

```sh
supabase stop
```

Create and test a schema change:

```sh
supabase migration new descriptive_change_name
supabase db reset
pnpm test:db
```

Review every migration before committing it. All application tables, constraints, indexes, functions, triggers, grants, and row-level security policies should be reproducible from the ordered files in `supabase/migrations/`.

Refresh the checked-in TypeScript database types after applying or pulling a schema change:

```sh
pnpm types:generate
```

This command reads the linked Supabase project, so run `supabase login` and `supabase link` first. Review the generated diff alongside the migration that caused it.

Preview and deploy pending migrations to the linked project:

```sh
supabase db push --dry-run
supabase db push
```

## Recovery and drift

If the hosted development project was changed directly through the Dashboard, capture and review the change before continuing:

```sh
supabase db pull
supabase db reset
```

`supabase db reset` rebuilds only the local database from migrations and seed data. Do not run `supabase db reset --linked` against the hosted project: it is destructive and erases remote data.

The local project link is stored under `supabase/.temp/`. That directory is ignored by Git, so each developer or automation environment must run `supabase link` independently.

## Application development

Start the Next.js development server at [http://localhost:3000](http://localhost:3000):

```sh
pnpm dev
```

Run the project quality checks:

```sh
pnpm verify
```

Run the same complete quality gate and production build used by Vercel:

```sh
pnpm build
```

Use `pnpm test:watch` while developing tests and `pnpm format` to apply formatting.
See [docs/security-testing.md](./docs/security-testing.md) for the RLS checklist
and the two-account deployed authentication smoke test.
See [docs/r1-testing.md](./docs/r1-testing.md) for the authenticated Today and
Setup functional browser suite.
See [docs/navigation-performance.md](./docs/navigation-performance.md) for the
authenticated Today/Week/Stats/Setup latency baseline and advisory post-deploy
regression workflow.

Application code lives under `src/`. Routes are defined in `src/app/`; reusable components, data access, and utilities should be added under `src/components/`, `src/data/`, and `src/lib/` as those layers are introduced. Tests live beside the code they cover.

## Vercel deployment workflow

Vercel is connected to the GitHub repository and uses `main` as the production branch. Every other pushed branch or pull request receives a protected preview deployment. A push to `main` creates a production deployment and updates [habitledger.vercel.app](https://habitledger.vercel.app/) after a successful build.

The standard `build` script makes every Vercel deployment run the complete quality suite before the production build:

```sh
pnpm build
```

The quality suite includes linting, generated route types and TypeScript checks, tests, and formatting validation. A failure in any command fails the Vercel deployment.

### Smoke checks

After a preview or production deployment, verify both the application and its uncached health endpoint:

```sh
curl --fail --show-error --silent https://habitledger.vercel.app/ > /dev/null
curl --fail --show-error --silent https://habitledger.vercel.app/api/health
```

The health endpoint should return HTTP 200 with `{"status":"ok"}`. Protected preview deployments can be checked through the authenticated CLI:

```sh
vercel curl /api/health --deployment <preview-url> --scope curtis-s-team
```

### Rollback

List recent production deployments and identify the last known-good deployment URL or ID:

```sh
vercel list habit-ledger --scope curtis-s-team
```

Roll the production aliases back to it, then repeat the smoke checks:

```sh
vercel rollback <deployment-id-or-url> --scope curtis-s-team
```

After diagnosing the regression, fix it through the normal branch and pull-request workflow. Do not treat a rollback as the permanent source-of-truth change.

## Deployment status

GitHub, Supabase, and Vercel are connected. Preview and production deployments are operational, and the production application is available at [habitledger.vercel.app](https://habitledger.vercel.app/).
