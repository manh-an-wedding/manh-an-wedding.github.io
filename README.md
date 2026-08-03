# Mạnh & An's invitation

Bilingual wedding invitation built with Angular 22 and Supabase. The site contains the invitation,
album, Q&A, RSVP flow, tokenized group lists and an authenticated administration page.

## Local development

```bash
npm install
npm start
```

Open `http://localhost:4200`. The English route is `/en`, administration is `/admin`, and public
group pages use `/view/<slug>?t=<generated-token>`.

## Verification

```bash
npm test -- --watch=false
npm run build
```

Do not run `npm audit` as part of the normal project workflow. Supabase migrations and rollback-safe
verification queries are under `supabase/migrations` and `supabase/tests`.

## Deployment

A push to `main` runs `.github/workflows/deploy.yml`, tests, builds, creates static route documents
and deploys `dist/manhan-web/browser` to GitHub Pages.

Before sending invitations, run `supabase/scripts/clear_test_data_before_invites.sql` manually once.
It deletes test RSVP/wish data while preserving admin users, groups, settings and public-page tokens.

The publishable Supabase key is intentionally present in browser config. Never commit a Supabase
secret/service-role key, database password or admin password.
