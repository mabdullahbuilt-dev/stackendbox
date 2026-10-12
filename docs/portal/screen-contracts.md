# Portal screen contracts and verification

The October 12 requirements supersede the read-only DNS product scope. Live writes are still disabled. Existing corporate domains must never be test targets.

| Screen | Read and action contracts | Authorization and failure behavior |
| --- | --- | --- |
| Client overview, domains, renewals, websites | `GET /api/portal/data`, tenant membership scoped even for administrators | Verified server identity plus RLS, no supplier data. In-memory cache is scoped to verified user ID and expires after 30 seconds. No persistent browser cache. |
| Administrator acquisition | `POST /api/portal/admin/domain-search`, verified quotes, approved requests and external payment evidence | Staff role and MFA required. No client Buy Domain route. Missing supplier evidence blocks quoting and live purchasing remains disabled. |
| Client renewal | Assigned domain, current administrator-issued renewal quote and guarded Sandbox order | Online renewal is explicitly disabled without a current quote or enabled Sandbox acceptance. Support remains available. Server revalidates the quote, domain and supplier evidence before creating an order. |
| Domain DNS and settings | `GET/POST /api/portal/domains/:name/manage` | Assigned noncorporate domain, RLS, MFA for mutations, explicit confirmation, live flag and per-domain allowlist. Provider state version and durable active-operation uniqueness protect concurrent operations. |
| Billing | Tenant orders and invoice records; `GET /api/portal/invoices/:id/download` | RLS and client access protect downloads. Escaped HTML sandbox receipts are labeled. Payment redirect never proves payment. |
| Support | `requests`, `requests/:id/messages` | Tenant authorization, durable request/message and notification records. Admin status controls appear only under `/admin/support`. |
| Private administration | `/admin`, `/admin/support`, `/admin/billing`, `/admin/security`; `admin/workspace`, `admin/data` | Server-controlled super-admin role and verified MFA on route and API. Client navigation never links to administration. |
| Account invitation/recovery | Supabase-generated one-time hashed links sent with the client Brevo integration | No secrets in logs or outbox. Recipient must match approved account for recovery. Browser receives generic recovery response. Ambiguous sends are audited, never reported as confirmed. |

## Provider write recovery

Apply `202610120002_domain_operations.sql` before enabling any domain writes. The partial unique index allows only one applying or review-required operation per domain. An uncertain network response retains the lock. Operators must read provider state and review evidence before resolving it. No automatic timeout unlock is allowed.

DNS replacement creates and verifies the new record before deleting the old value. CNAME replacements requiring a delete-first conflict override are rejected for support review. `force` is always false. Product-managed and personal-nameserver records cannot be changed through custom DNS editing.

## Actual verification status

- Implemented locally: separate server-protected admin routes, client-scoped data, session-local reuse, bounded search, typed DNS planner, guarded DNS/nameserver/privacy adapter, durable operation schema, Brevo auth delivery path, restrained client layout.
- Tests use realistic DNS fixtures and mocked provider responses. They do not prove a live domain modification.
- Authenticated browser acceptance completed for client navigation, empty inventory and actual name search. `/admin` correctly stopped at the MFA gate. Full admin acceptance, new migration application, two-client browser isolation and sandbox payment/renewal acceptance remain pending. Supplier-pricing evidence is absent.
- Known external limits: last authenticated inventory read returned zero domains. No domain was fabricated or assigned. Live domain charges and modifications remain disabled.
- No 100,000-user performance claim is made. Bounded query limits still need cursor pagination before large tenant accounts are supported.
