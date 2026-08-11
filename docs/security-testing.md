# Security testing

Habit Ledger treats authorization as a database responsibility. Application
route checks improve the user experience, but every user-owned table must also
enforce ownership with row-level security (RLS).

## Automated authentication coverage

The Vitest suite verifies the browser-visible server boundaries:

- verified JWT claims expose only the stable subject identifier;
- missing, expired, malformed, and spoofed tokens redirect before private
  layouts render;
- unavailable authentication fails closed;
- valid PKCE callbacks exchange the code and accept only local destinations;
- missing or expired callback codes return to sign-in with a recoverable error;
- sign-out clears the local session and returns a `303` redirect to sign-in; and
- refreshed and expired session cookies are propagated to the browser along
  with the response's private, no-store cache headers.

The pgTAP suite in `supabase/tests/database/` runs with an authenticated role
and real JWT subject claims. It verifies that a user sees only their own profile
and cannot select, update, or delete another user's profile.

Run both suites before merging a user-data change:

```sh
pnpm test
pnpm test:db
```

## Two-account deployed smoke test

Use dedicated, non-personal test accounts. Never commit their magic links,
access tokens, refresh tokens, or inbox credentials.

1. Open the deployment in two separate browser profiles.
2. Sign in as test user A in one profile and test user B in the other.
3. Confirm each account reaches `/today`, can open `/setup`, and retains its
   session after a refresh.
4. Sign out user A and confirm a direct request to `/today` returns to
   `/sign-in`; confirm user B remains signed in.
5. Obtain a short-lived access token from each isolated test session and run
   the Data API smoke test below against the same Supabase project used by the
   deployment.

```sh
SMOKE_SUPABASE_URL="https://project-ref.supabase.co" \
SMOKE_SUPABASE_PUBLISHABLE_KEY="publishable-key" \
SMOKE_USER_A_ACCESS_TOKEN="short-lived-token-a" \
SMOKE_USER_B_ACCESS_TOKEN="short-lived-token-b" \
pnpm smoke:auth-isolation
```

The script verifies each token's claims, confirms the verified `sub` matches a
fresh Auth user lookup, and checks that the two tokens belong to different
users. Each client must see exactly its own profile, cross-user reads and
updates must affect no rows, and a cross-user delete must not remove the target
profile. The fresh `getUser()` call is intentional in this out-of-band smoke
test because it checks current server-side session state; routine application
SSR authorization uses `getClaims()` so the Auth user endpoint is not in the
warm request path. Discard the tokens after the run and record only the
deployment URL, date, and pass/fail result in the task or pull request.

## Checklist for every future user-owned table

Apply these cases to `habits`, `schedules`, `completions`, and any later table
that stores private user data:

- RLS is enabled and the anonymous role has no unintended privileges.
- User A can select, insert, update, and delete only the operations intended for
  rows owned by user A.
- User A cannot select, update, or delete a row owned by user B.
- Inserts and ownership-changing updates cannot assign a row to another user.
- Ownership is derived from `auth.uid()` or an RLS-protected parent, never from
  trusted client input alone.
- Foreign-key paths cannot expose or mutate another user's related records.
- Unique constraints and idempotent mutations remain correct under repeated or
  concurrent requests.
- Archive behavior preserves completion history and does not make historical
  records visible to another user.
- Service-role access exists only in server-only administrative code and is not
  required for normal product flows.
- The pgTAP suite exercises policies with authenticated roles and JWT claims;
  policy-name inspection alone is insufficient.
