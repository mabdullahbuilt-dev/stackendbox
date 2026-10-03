# StackEndBox: public website

Next.js (App Router) · GSAP (scroll scenes) · Motion (state) · React Three Fiber (hero only).

## Run
`npm i && npm run dev`, checks: `npm run lint && npm run typecheck && npm test && npm run build`.

## Configuration (see `.env.example`)
Nothing is invented: UI depending on a missing value is omitted.
- `BRIEF_WEBHOOK_URL` and/or `RESEND_API_KEY` + `BRIEF_TO_EMAIL` + `BRIEF_FROM_EMAIL`, **required** for `/api/brief` (otherwise it answers 503).
- `NEXT_PUBLIC_SCHEDULING_URL`, `NEXT_PUBLIC_CONTACT_EMAIL`, `NEXT_PUBLIC_WHATSAPP_URL`, `NEXT_PUBLIC_GITHUB_URL`, social URLs.
- Project screenshots: drop `public/work/<slug>.(avif|webp|png)` for resolve, meridian, repodiet, agora-forge, xroga; add real `liveUrl`/`githubUrl` in `content/projects.ts`.
- Trust slots (`content/trust.ts`) stay empty until real, permissioned data exists.

## Tools
`scripts/render-posters.mjs` regenerates hero posters (`POSTER_TOOL=1`). QA scripts live in `scripts/`.
