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
- A password-authenticated administrator account was observed in the built-in browser. The new `/admin` route correctly requires a fresh MFA-verified session. Full administrator browser acceptance remains outstanding.
- Invitation and recovery now generate Supabase one-time links and send them through the configured client Brevo API. This path does not require Supabase SMTP. Actual recovery and new-client invitation acceptance still need end-to-end verification.
- Account-profile diagnostics returned 403 because `company:basic:read` is absent. Payment-read access was independently verified without expanding the key's permissions.
- Complete a real sandbox checkout and observe verified webhook processing, durable job completion, invoice creation, and email acceptance. Provisioning succeeded after the approved webhook permission update, but this is not evidence of a completed payment.
- Verify refund/dispute reconciliation before accepting production payments. Signed refund/dispute events retrieve authoritative resources, hold pending simulations, retain review evidence and record the verified cumulative sandbox refund total. Final dispute resolution remains an administrative review, and no registrar mutation is implemented.
- Vercel's daily cron runs only on Production. Preview queued work can be processed by the authenticated MFA-protected admin action. Verified webhook requests also trigger a background attempt, retaining queued work on failure.
- Complete authenticated desktop/mobile, uploads/downloads, password recovery, support, and two-client browser tests.
- Confirm real supplier pricing evidence, eligibility rules, contact requirements and explicit domain assignments. Pricing defaults fail closed, with no eligible TLDs and a zero supplier-cost cap.

## Operational boundaries

Every order is sandbox-only. Registration, renewal, auto-renew changes, contact updates, personal nameservers and transfer execution remain unimplemented and disabled. DNS, custom nameserver and privacy mutation code now exists behind MFA, explicit confirmation, a disabled live flag and an empty per-domain allowlist. The new operation-lock migration must be applied and reviewed before enabling writes. No real registrar writes were tested. Registrar inventory is separate from the clearly labeled sandbox purchase view. `stackendbox.com` cannot be assigned to a client. Processor fees remain unreconciled when not verified. A browser success redirect never marks an order paid.

## October 12 redesign verification

- Client navigation and client data are separated from `/admin`, including when a super-admin uses the client portal. MFA enforcement has no environment-variable bypass.
- Authenticated browser checks confirmed the simplified navigation, zero-domain state, website empty state and live Spaceship name search. Seven actual available alternatives were returned for a partial name. Missing supplier evidence correctly withheld retail quotes.
- Deployed read-only diagnostics confirmed database access, zero registrar domains, Whop sandbox payment-read access with zero payment records, and an active Brevo sender. Observed check durations were 1203 ms for the database, 1110 ms for registrar inventory plus availability, 116 ms for Whop and 385 ms for Brevo. These are one-run diagnostic timings, not a load test or a before/after performance claim.
- Real Spaceship responses use `taken` for registered names. The adapter mapping and regression test now cover that value.
- Downloadable HTML sandbox receipts validate money and escape untrusted text. They are explicitly not tax invoices or registration proof.
- Local tests cover domain candidates including IDNs, DNS types/conflicts/replacement safety, provider write guards, admin MFA and receipt escaping. See the latest test run for the exact count.
- Final local run: 104 tests across 14 files passed, with type checking and lint clean. Production builds passed. Eight deployed unauthenticated/unsigned endpoint checks returned the expected denials. Mobile navigation and domain/search pages had no horizontal overflow at the tested mobile widths. These checks do not substitute for paid checkout or two-tenant browser acceptance.
- Empty client accounts now skip 13 tenant-table queries and the assignment query. MFA-factor lookup runs concurrently with membership lookup. Session-local data reuse reduces repeated warm navigation loads. No numerical user-perceived speedup is claimed without a controlled before/after run.
- Remaining engineering work includes durable live purchase/renewal execution and reconciliation, contact/personal-nameserver workflows, advanced transfer authorization, admin reconciliation tooling and scalable cursor pagination. These are not represented as completed features.

`/api/portal-diagnostics` is read-only, disabled outside Vercel Preview, and requires a per-deployment random secret. `scripts/portal-preview.mjs` keeps that token in process memory. No token is logged or committed.
