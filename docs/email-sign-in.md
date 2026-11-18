# Email sign-in setup

1. In Resend, add `beans.curtisbos.com` as the sending domain. Publish the SPF and DKIM records shown by Resend in the DNS zone for `curtisbos.com`, then verify the domain. Leave click tracking disabled so the button URL goes directly to Habit Ledger.
2. Create a Resend sending API key scoped to `beans.curtisbos.com`. In the Habit Ledger Supabase project, enable custom SMTP in [Authentication settings](https://supabase.com/dashboard/project/jlxfxysadkbzcfpdjttq/auth/smtp). Use the values below and enter the key directly into the SMTP password field.

   | Setting      | Value                         |
   | ------------ | ----------------------------- |
   | Sender email | `noreply@beans.curtisbos.com` |
   | Sender name  | `Habit Ledger`                |
   | Host         | `smtp.resend.com`             |
   | Port         | `465`                         |
   | Username     | `resend`                      |

3. In Authentication → Rate Limits, set the email limit to **30 emails per hour**. Keep the SMTP resend interval at **60 seconds**. The built-in mail service defaults to only two emails per hour, which is too low for production magic-link sign-in.
4. Once `/auth/confirm` is deployed, confirm that the Supabase Auth Site URL is `https://habitledger.curtisbos.com`. In Authentication → Emails, set both **Magic Link** and **Confirm Signup** to the subject `Sign in to Habit Ledger` and the [checked-in email body](../supabase/templates/sign-in.html). The Site URL controls the host in both emails.
5. Request a link from the live app. Check the From address and that the email button points directly to `https://habitledger.curtisbos.com/auth/confirm`. Open it in a fresh browser, confirm sign-in, and check that it opens Today with the existing account’s habits. Repeat for a test signup if signups are enabled. Confirm that a used link offers a fresh request.
6. Disable Google under Authentication → Sign In / Providers after verifying email sign-in for an existing Google user using their Google email address.

For local testing with a local Supabase stack, set the Auth Site URL to your local Next.js origin in your local configuration before starting Supabase. The templates in `supabase/config.toml` use that URL and the local inbox.
