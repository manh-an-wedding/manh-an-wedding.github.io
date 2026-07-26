# Wedding Invite — Nhật An ❤ Duy Mạnh — Project Handoff

Single-page bilingual (VI/EN) wedding invitation for **Lễ Vu Quy**. Guests RSVP
(3 options + companions + HCM–Cần Thơ bus + phone), leave public/private wishes,
read a Q&A accordion (with gift QR), play background music. Static Angular SPA on
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
- **Identity by typed name** (append-only; no login/tokens). `rsvp` is append-only; the current
  choice is `rsvp_latest` = distinct on `(name_norm, device_id)` ordered by `created_at desc, id desc`
  (the `id desc` tiebreaker matters — `now()` ties within a transaction). A random `device_id` in
  `localStorage` (`DeviceIdService`) distinguishes "same person editing" from a name clash; the RSVP
  form shows a clash popup when name+group+status match but device_id differs.
- **Name matching** uses `nameNorm()` (`src/app/core/name-normalize.ts`) — strips VN diacritics, đ→d.

## Supabase (project already provisioned)
- Project URL: `https://bmhwpctxxfpculhigham.supabase.co` (also in `wedding.config.ts`).
- The key in `wedding.config.ts` is the **publishable (anon) key** — public by design, safe to commit.
  **NEVER commit the service_role/secret key.**
- Schema/RLS/views: `supabase/migrations/0001_init.sql` (already applied to the project).
  Verify script: `supabase/tests/0001_init.verify.sql`.
- **RLS verified live:** anon SELECT on `rsvp`/`companions`/`rsvp_latest` = permission denied;
  anon reads only `guests_public` (names) and `wishes_public` (public wishes, no ip/device);
  anon INSERT on `rsvp`/`wishes` = OK; anon INSERT on `page_visits` = denied (edge-fn only).
- Views for the couple (admin): `rsvp_latest`, `possible_duplicates` (names spanning >1 device),
  `bus_manifest` + `bus_seat_count` (counts only companions of the LATEST rsvp per person),
  `wishes_public`, `guests_public`. Read them via Supabase Dashboard (admin), not the anon key.
- Edge Function `supabase/functions/log-visit/` captures real client IP + device_id into `page_visits`
  (the only reliable way to get client IP; runs with the auto-injected service role).

## Deploy (GitHub Pages)
- Org/repo: **`manh-an-wedding/manh-an-wedding.github.io`** (Public). Site URL (root): `https://manh-an-wedding.github.io`.
- CI: `.github/workflows/deploy.yml` — on push to `main`, builds `ng build --base-href /`, copies
  `index.html`→`404.html` (SPA fallback so `/en` deep-links resolve), publishes to Pages.
- Pages source must be set to **GitHub Actions** in repo Settings → Pages.
- **Gotcha:** `git push` on this Windows machine triggers an interactive Git Credential Manager
  popup — it must be run by the user in a real terminal to complete GitHub auth (a background push
  times out). Remote `origin` is already configured; work is merged to `main` locally.

## Current status (branch: main; feat/build merged in)
DONE (24 unit tests pass, build green):
- Full frontend + services: config, name-normalize, device_id, Supabase client + rsvp/wishes/guests/visit
  services, i18n + Option C routing, language toggle, RSVP form (+clash popup), companions editor,
  wishes wall, FAQ + gift QR, map + calendar (.ics/Google), invite page + music toggle, Open Graph tags.
- Supabase schema + RLS applied and verified live; app wired to the real project.
- Backend/CI files authored: migration, log-visit edge function, deploy workflow, guest-import doc.

REMAINING:
1. **Push `main` to origin** (user runs `git push -u origin main`; completes GCM auth) → Actions deploys.
2. **Deploy the edge function** so visit-counting/IP works: `npx supabase login` (user, interactive),
   then `npx supabase link --project-ref bmhwpctxxfpculhigham` + `npx supabase functions deploy log-visit --no-verify-jwt`.
3. **Browser smoke test** on the live site: submit RSVP + companion + bus + phone, re-submit same
   name/device (no popup), different device (popup), post public + private wish, open FAQ gift QR,
   confirm rows land in Supabase + a `page_visits` row appears.
4. **Import guest list** (optional, enables name autocomplete + invited-vs-confirmed): see `scripts/import-guests.md`.

## ⚠️ PRE-LAUNCH GATE — replace ALL fake data before printing the QR / going live
`src/assets/config/wedding.config.ts` + `public/assets/i18n/*.json` still contain PLACEHOLDER data
(marked `DATA GIẢ` / `[GIẢ]`). Wrong gift QR/bank = guests sending money to a nonexistent account.
Before launch, run and confirm **no matches**:
```bash
grep -rn "GIẢ\|REPLACE\|placeholder\|0000000000\|1111111111" src/assets/config/
```
Replace: gift QR images + bank/account/name; event venue/address/map/datetime; bus
pickup/time/duration + RSVP groups + deadline; Q&A "(cập nhật sau)" answers.

### Assets to add (drop files here — names must match `wedding.config.ts`)
Static assets are served from `public/` (mapped to `/`). Folders + READMEs already exist:
| Put file at | Config key | Notes |
|-------------|-----------|-------|
| `public/assets/img/cover.jpg`    | `media.coverImg`   | hero photo, ~3:4 portrait |
| `public/assets/img/couple-1.jpg` | `media.couplePhotos[0]` | optional |
| `public/assets/img/qr-bride.png` | `gift.bride.qr`    | bride VietQR (square) |
| `public/assets/img/qr-groom.png` | `gift.groom.qr`    | groom VietQR (square) |
| `public/assets/audio/bg-music.mp3` | `theme.music`    | background music, keep small |
Hero hides the cover `<img>` gracefully (via `coverOk` flag + `(error)`) until the file exists.
To change a filename, edit the matching key in `wedding.config.ts`.

## Section toggles + theme
- `wedding.config.ts` → `sections: { wishes, faq }` toggles the Wishes wall and Q&A accordion.
  **Currently both `false` (hidden)** per request; set to `true` to show. Wired via `@if` in
  `invite.component.html`.
- Visual theme (red-traditional VN) lives in `src/styles.scss` (CSS vars from `theme` colors,
  Playfair Display + Be Vietnam Pro via Google Fonts @import, invitation-card layout, hero with 囍).
  `InviteComponent` renders the hero (names/date/cover) above the feature cards.

## Conventions
- TDD: failing test → run → implement → pass → commit. Small, focused commits.
- Don't reintroduce a cover page or `/vi` prefix (both intentionally removed).
- Keep the publishable key in config; never add the service key anywhere in the repo.
