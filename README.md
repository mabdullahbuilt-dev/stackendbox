# StackEndBox: public website

Next.js (App Router) · GSAP (scroll scenes) · Motion (state) · React Three Fiber (hero only).

## Run
`npm i && npm run dev`, checks: `npm run lint && npm run typecheck && npm test && npm run build`.

## Configuration (see `.env.example`)
Nothing is invented: UI depending on a missing value is omitted.
- Brief delivery uses Brevo transactional email (server only): `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `BRIEF_TO_EMAIL`. Required for `/api/brief` (otherwise it answers 503). Optional Turnstile: `NEXT_PUBLIC_TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY`.
- `NEXT_PUBLIC_CAL_URL` (Cal.com popup, new tab fallback; defaults to https://cal.com/stackendbox/work-with-stackendbox), `NEXT_PUBLIC_COMPANY_EMAIL` (defaults to hello@stackendbox.com), `NEXT_PUBLIC_WHATSAPP_URL`, `NEXT_PUBLIC_GITHUB_URL`, social URLs.
- Project screenshots: drop `public/work/<slug>.(avif|webp|png)` for resolve, meridian, repodiet, agora-forge, xroga; add real `liveUrl`/`githubUrl` in `content/projects.ts`.
- Trust slots (`content/trust.ts`) stay empty until real, permissioned data exists.

## Tools
`scripts/render-posters.mjs` regenerates hero posters (`POSTER_TOOL=1`). QA scripts live in `scripts/`.
