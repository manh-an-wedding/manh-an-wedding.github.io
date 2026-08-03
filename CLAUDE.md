# Wedding Invite — Nhật An ❤ Duy Mạnh — Project Handoff

Single-page bilingual (VI/EN) wedding invitation for **Lễ Vu Quy**. Guests RSVP
(3 options + companions + HCM–Cần Thơ bus + phone), read a Q&A accordion and play background music. Static Angular SPA on
GitHub Pages + Supabase as the data layer. **Config-driven** (all content/theme in
one typed object) so it can be reused for other weddings later.

## Read these first
- Design spec: `docs/superpowers/specs/2026-07-01-wedding-invite-design.md`
- Implementation plan (19 tasks, TDD): `docs/superpowers/plans/2026-07-01-wedding-invite-implementation.md`
- These two are the source of truth for WHY/HOW. Keep them in sync if you change behavior.

## Stack & key versions (don't assume older APIs)
- **Angular 22**, standalone components (no NgModule).
- Unit tests: **vitest + jsdom** via `@angular/build:unit-test` — NOT Karma/ChromeHeadless.
  Run: `npm test -- --watch=false` (no `--browsers` flag). Jasmine-style `describe/it/expect` + `TestBed`.
- i18n: **@ngx-translate/core v18** — there is **NO `TranslateModule`**. Components import
  `TranslatePipe`; tests use `provideTranslateService({})`; app wires
  `provideTranslateService({ lang:'vi', fallbackLang:'vi', loader: provideTranslateHttpLoader({prefix:'assets/i18n/', suffix:'.json'}) })` in `app.config.ts`.
- Data client: `@supabase/supabase-js` v2.
- Build output: `dist/manhan-web/browser`. Dev: `npm start` (http://localhost:4200).

## Architecture facts
- **Routing = Option C:** Vietnamese at root `/` (no prefix), English at `/en`. Routes carry
  `data.lang`; `InviteComponent` reads it and calls `translate.use()`. Toggle links `/`↔`/en`.
- **No cover page** — content shows immediately. Music via a floating 🔊/🔇 toggle button
  (browsers block autoplay without a gesture).
- **Config-driven:** everything (couple, event, groups, gift QR, FAQ, theme, i18n, Supabase
  URL+key) lives in `src/assets/config/wedding.config.ts` (typed by `src/app/core/wedding-config.ts`,
  provided via `WEDDING_CONFIG` token). Reuse = swap this file.
- **Identity by typed name** (no guest login). A new submission supersedes the previous active row
  with the same normalized name + group. During the same page session, an opaque edit token lets the
  guest update the row in place; only its SHA-256 hash is stored. Cross-group same-name and same-phone
  cases are sent to admin duplicate review.
- No device identifier, visit tracking or raw IP is stored. New submissions are limited to 20 per
  15 minutes per IP using a short-lived HMAC hash in `private.rsvp_rate_limit_events`.
- **Name matching** uses `nameNorm()` (`src/app/core/name-normalize.ts`) — strips VN diacritics, đ→d.

## Supabase (project already provisioned)
- Project URL: `https://bmhwpctxxfpculhigham.supabase.co` (also in `wedding.config.ts`).
- The key in `wedding.config.ts` is the **publishable (anon) key** — public by design, safe to commit.
  **NEVER commit the service_role/secret key.**
- Migrations `0001`–`0015` are applied to the linked project. Verification scripts live in
  `supabase/tests/`; `0010`–`0015` have been run against live inside rollback transactions.
- **RLS verified live:** anon SELECT on `rsvp`/`companions`/`rsvp_latest` = permission denied;
  anon reads only safe public RPC/views and submits through validated RPCs.
- Views for the couple (admin): `rsvp_latest`, `possible_duplicates`,
  `bus_manifest` + `bus_seat_count` (counts only companions of the current RSVP).
- Migration `0010_remove_technical_tracking.sql` removes `page_visits`, RSVP/wish IP/device columns,
  and their legacy RPCs.
- `get_public_group_rsvps(slug, token)` exposes only a configured group page when its generated token
  matches. The raw tables and token table remain unreadable to anon clients.
- Wishes are hidden and their public RPC/view permissions are revoked by migration `0014`.
- The old `log-visit` Edge Function has been deleted from the live project.

## Deploy (GitHub Pages)
- Org/repo: **`manh-an-wedding/manh-an-wedding.github.io`** (Public). Site URL (root): `https://manh-an-wedding.github.io`.
- CI: `.github/workflows/deploy.yml` — on push to `main`, builds `ng build --base-href /`, copies
  `index.html`→`404.html` (SPA fallback so `/en` deep-links resolve), publishes to Pages.
- Pages source must be set to **GitHub Actions** in repo Settings → Pages.
- Remote `origin` is already configured. GitHub Pages deploys only after a successful push to `main`.

## Current status
DONE (99 unit tests pass, production build green):
- Full frontend + services: config, name-normalize, Supabase client + rsvp/wishes/guests services,
  i18n + Option C routing, language toggle, RSVP form, companions editor,
  hidden wishes wall, visible Q&A, map + calendar (.ics/Google), invite page + music toggle, album,
  public group page, admin RSVP review, Open Graph tags.
- Supabase migrations `0001`–`0015` are applied; database lint reports no schema errors.
- RSVP writes use validated RPCs, admin RPCs verify `is_rsvp_admin()`, and direct table writes are revoked.

REMAINING:
1. Push the finalized branch to `origin/main` so GitHub Actions deploys it.
2. Smoke-test the deployed invitation, `/admin`, `/en`, and the tokenized public group link.
3. Immediately before invitations are sent, manually run
   `supabase/scripts/clear_test_data_before_invites.sql`. Never run it during development.

## Pre-launch gate
- Confirm event, bus, family, Q&A and translation content in `wedding.config.ts` and both i18n files.
- The wedding photos are loaded from the public `wedding-media/v1` Supabase Storage path; do not add
  the originals to Git. The local fallback must remain non-personal.
- Run the cleanup script only after final testing and immediately before sharing the QR/link.
- Keep the current music only with the owner's acknowledged copyright risk.

## Section toggles + theme
- `wedding.config.ts` → `sections: { wishes, faq }` toggles the Wishes wall and Q&A accordion.
  **Currently Wishes is hidden and Q&A is visible.** Wired via `@if` in
  `invite.component.html`.
- Visual theme (red-traditional VN) lives in `src/styles.scss` (CSS vars from `theme` colors,
  Playfair Display + Be Vietnam Pro via Google Fonts @import, invitation-card layout, hero with 囍).
  `InviteComponent` renders the hero (names/date/cover) above the feature cards.

## Conventions
- TDD: failing test → run → implement → pass → commit. Small, focused commits.
- Don't reintroduce a cover page or `/vi` prefix (both intentionally removed).
- Keep the publishable key in config; never add the service key anywhere in the repo.
