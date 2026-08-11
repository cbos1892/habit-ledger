# Google OAuth setup

Habit Ledger uses Supabase Auth as the OAuth broker. The application starts the
Google flow through Supabase, Google returns to Supabase, and Supabase redirects
the browser to the application's existing PKCE callback route.

No Google client secret belongs in this repository or in a `NEXT_PUBLIC_*`
environment variable.

## 1. Create the Google OAuth client

In the [Google Auth Platform](https://console.cloud.google.com/auth/overview):

1. Create or select a Google Cloud project.
2. Configure the OAuth consent screen for an external application.
3. Request only the default identity scopes: `openid`, `email`, and `profile`.
4. Create an OAuth client with application type **Web application**.
5. Add this exact authorized redirect URI:

   ```text
   https://jlxfxysadkbzcfpdjttq.supabase.co/auth/v1/callback
   ```

The authorized JavaScript origins field is not required for the server-driven
redirect flow used by this application.

Publish the app when it is ready for users outside the Google OAuth test-user
list. Do not add access to Google Calendar, Drive, Gmail, or other APIs unless a
feature explicitly needs it; sensitive scopes can introduce additional review
requirements.

## 2. Enable Google in Supabase

In the Supabase dashboard for project `jlxfxysadkbzcfpdjttq`:

1. Open **Authentication → Sign In / Providers → Google**.
2. Enable the provider.
3. Paste the Google OAuth client ID and client secret.
4. Save the provider configuration.

The secret stays in Supabase. The Next.js application does not need an
additional environment variable.

Under **Authentication → URL Configuration**, confirm:

```text
Site URL
https://habitledger.vercel.app

Redirect URLs
http://localhost:3000/auth/callback
http://127.0.0.1:3000/auth/callback
https://habitledger.vercel.app/auth/callback
https://habit-ledger-git-codex-performance-foundation-curtis-s-team.vercel.app/auth/callback
```

Add deliberate Vercel preview callback URLs before testing a preview. Prefer
the branch's stable Vercel alias over a one-off deployment URL, and avoid a
broad production wildcard when an exact preview URL is sufficient.

## 3. Verify the deployed flow

1. Open `https://habitledger.vercel.app/sign-in` in a private browser window.
2. Choose **Continue with Google** and complete consent with a new account.
3. Confirm the browser lands on `/today` or the profile setup flow.
4. Sign out and repeat with an email address that previously used a magic link.
5. Confirm Supabase shows one user with linked email and Google identities, not
   two user/profile records.
6. Cancel one Google attempt and confirm the sign-in page offers a retry and the
   email fallback.

Supabase automatically links identities that share the same provider-verified
email. The same-email case is still part of the smoke test because duplicate
profiles would be a high-impact regression.

## Local Supabase option

Normal application development can use the hosted Supabase project from
`.env.local`, including OAuth callbacks to localhost. If a fully local Supabase
Auth stack is needed later, add an `[auth.external.google]` section to
`supabase/config.toml` and inject its client secret through an ignored local
environment file. Do not commit the secret.
