# Portal verification and release gates

The portal is under `/client-portal` on a feature branch. Do not merge or promote until the remaining release gates are verified. The public homepage and existing brief-delivery handler were not modified.

## Verified

- Existing GitHub repository and Vercel project access restored using isolated CLI configuration directories.
- Initial portal migration applied to the existing Supabase project. All 23 portal tables have RLS enabled.
- `supabase/tests/portal_security.sql` passed against Supabase. Fixtures and all test effects rolled back. Covers tenant isolation, admin MFA, authoritative email revocation, protected-domain assignment, payment amount mismatch, event/payment replay, one invoice per order, unpaid-order protection, and simulated fulfillment without inventory mutation.
- Local unit tests cover deterministic integer pricing, input validation, live-operation guards, raw webhook signatures, expired signatures, and provider-payment correlation. These mocked provider tests are not evidence of a real completed checkout.
- Deployed Preview can read the portal schema with the server credential.
- Spaceship read-only inventory API authenticates but currently returns zero domains. No client assignments or example domains were invented.
- Brevo confirms the configured client sender is active. The approved first super-admin was created and its invitation was accepted by Brevo. The user confirmed password and authenticator setup. The one-time bootstrap endpoint was removed from the source after use.
- Supabase Site URL and its exact redirect allowlist now use `https://stackendbox-portal-preview.vercel.app/client-portal/auth/callback`, saved after explicit approval. Local recovery and invitation redirects were aligned with that exact URL.
- Whop sandbox payment-read access is verified against the existing company. No payment records were returned.
- After explicit approval and the user's Whop identity check, `developer:manage_webhook` was added to the existing sandbox key. Sandbox registration product `prod_PDDbs2Lxnr2XU`, renewal product `prod_FI2F8qY7L7sta`, and signed webhook `hook_bNPTtzciu4UaW` were provisioned. The webhook is enabled on the stable Preview callback. Its secret, product IDs, `PORTAL_APP_URL`, and a random `CRON_SECRET` were saved only to Preview. The temporary provisioning endpoint and script were removed after success.
- Login UI renders in Preview. After explicit approval, the stable Preview hostname was added to the existing Turnstile widget, preserving both production hostnames and Managed mode. A fresh Preview login load showed Cloudflare's green "Success!" state. Missing verification tokens now receive `verification_required` before password authentication, with a clear UI explanation and retry button.

## Remaining release gates

- Disable public Supabase signups after the requested browser confirmation.
- Verify the authenticated administrator session in the stable Preview. The user confirmed password and MFA setup, but browser verification remains outstanding.
- Configure Brevo SMTP credentials for Supabase invitation and recovery email delivery.
- Complete an authenticated login with the user's credentials and MFA. The successful browser challenge alone does not prove a completed login.
- Account-profile diagnostics returned 403 because `company:basic:read` is absent. Payment-read access was independently verified without expanding the key's permissions.
- Complete a real sandbox checkout and observe verified webhook processing, durable job completion, invoice creation, and email acceptance. Provisioning succeeded after the approved webhook permission update, but this is not evidence of a completed payment.
- Verify refund/dispute reconciliation before accepting production payments. Signed refund/dispute events retrieve authoritative resources, hold pending simulations, retain review evidence and record the verified cumulative sandbox refund total. Final dispute resolution remains an administrative review, and no registrar mutation is implemented.
- Vercel's daily cron runs only on Production. Preview queued work can be processed by the authenticated MFA-protected admin action. Verified webhook requests also trigger a background attempt, retaining queued work on failure.
- Complete authenticated desktop/mobile, uploads/downloads, password recovery, support, and two-client browser tests.
- Confirm real supplier pricing evidence, eligibility rules, contact requirements and explicit domain assignments. Pricing defaults fail closed, with no eligible TLDs and a zero supplier-cost cap.

## Operational boundaries

Every order is sandbox-only. There is no implementation of Spaceship registration, renewal, DNS mutation, auto-renew changes or transfer. Registrar inventory is separate from simulated fulfillment. `stackendbox.com` cannot be assigned to a client. Processor fees remain unreconciled when not verified. A browser success redirect never marks an order paid.

`/api/portal-diagnostics` is read-only, disabled outside Vercel Preview, and requires a per-deployment random secret. `scripts/portal-preview.mjs` keeps that token in process memory. No token is logged or committed.
