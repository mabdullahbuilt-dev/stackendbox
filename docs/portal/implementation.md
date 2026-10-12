# Client portal implementation

## Verified existing system

- Repository: `mabdullahbuilt-dev/stackendbox`, production commit `3595d8046851ff180e7577855b599589722e3928`.
- Existing Vercel project: `portfolio-ab4e/stackendbox`, serving `www.stackendbox.com`.
- Next.js 16 App Router, React 19, TypeScript, Zod, Vitest. Existing contact API uses Brevo.
- Supabase project: `irzjkdxxfvobtabwkqmz`. Read-only information_schema query returned no public or portal tables.
- Whop sandbox business: `biz_yHKx41unSUrn8o`.
- Integration secrets are Production-only. Supabase public URL/key are Production and Preview.
- Browser account has repository ownership. Current CLI identities lack repository push access and use another Vercel account.

## Implementation sequence

1. Add isolated portal schema with approved-identity checks, RLS, atomic payment transitions, domain protection and durable jobs.
2. Add Supabase server sessions, invite/recovery flows, Turnstile and durable rate limits.
3. Add real client/admin views, provisioning, read-only Spaceship synchronization and explicit assignment.
4. Add verified supplier quotes, one-time Whop sandbox checkout, signed webhook reconciliation and explicitly simulated fulfillment.
5. Add support conversations, websites, documents, billing, Brevo outbox and reminder scheduling.
6. Run security, integration-boundary and public-site regression checks. Deploy a preview using the existing project when matching deployment access is available.

## Boundaries

The initial implementation cannot execute paid Spaceship mutations, DNS writes, transfers or live Whop billing. Sandbox fulfillment must never change live inventory expiration. Missing pricing blocks checkout. Secret and supplier financial data live in separate tables without client SELECT permissions. Unapproved identity changes invalidate portal access through both server checks and database policy functions.

## Definition of done

The preview supports administrator-authorized login, tenant isolation, domain import/assignment, client domain details, sandbox purchase and renewal payments, signed idempotent events, support and email. Each external capability needs execution evidence before being called verified. Remaining blockers are recorded separately from implemented source.
