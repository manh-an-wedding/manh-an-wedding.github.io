# Wedding Invite (Nhật An ❤ Duy Mạnh) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a config-driven, bilingual (VI/EN), single-ceremony (Lễ Vu Quy) wedding invitation SPA with RSVP (3 options + companions + bus + phone), a public/private wishes wall, a Q&A accordion, background music, Google Map + calendar links, and visit/IP tracking — hosted free on GitHub Pages with Supabase as the data layer.

**Architecture:** Angular standalone-component SPA. All wedding content + theme + i18n strings live in one typed config object (not the DB), so the app is reusable for other weddings later. Guest data (RSVP, companions, wishes, page visits) is written directly to Supabase from the browser, protected by Row Level Security; the real client IP is captured by a Supabase Edge Function. Identity is by typed name (append-only, latest-row-wins), with a `localStorage` `device_id` distinguishing "same person editing" from a genuine name clash. Deployed as static files to GitHub Pages via GitHub Actions, with a `404.html` SPA fallback so deep links (`/vi`, `/en`) resolve.

**Tech Stack:** Angular **22** (standalone components, Angular Router, `@ngx-translate/core` **v18** for runtime i18n), `@supabase/supabase-js`, Supabase (PostgreSQL + RLS + Edge Functions/Deno), **vitest + jsdom** (Angular 22's `@angular/build:unit-test` builder — NOT Karma/ChromeHeadless), GitHub Actions, GitHub Pages.

> **Test runner note (discovered in Task 0):** run unit tests with `npm test -- --watch=false` (no `--browsers` flag; vitest runs headless via jsdom). Jasmine-style `describe/it/expect` + `TestBed` from `@angular/core/testing` work under this builder.
> **ngx-translate v18 note (CONFIRMED during Tasks 7–9):** v18 has **NO `TranslateModule`**. In components, `imports: [TranslateModule]` → use **`imports: [TranslatePipe]`** (`import { TranslatePipe } from '@ngx-translate/core'`). In tests, `TranslateModule.forRoot()` → use **`providers: [provideTranslateService({})]`**. App providers use `provideTranslateService({ lang:'vi', fallbackLang:'vi', loader: provideTranslateHttpLoader({ prefix:'assets/i18n/', suffix:'.json' }) })` (already wired in `app.config.ts`). Apply this substitution wherever later tasks show `TranslateModule`.

---

## File Structure

```
manhan/
├─ .github/workflows/deploy.yml         # CI: build Angular + publish to Pages
├─ angular.json, package.json, tsconfig*.json
├─ src/
│  ├─ index.html                        # OG meta placeholders, root
│  ├─ main.ts, styles.scss
│  ├─ app/
│  │  ├─ app.config.ts                  # providers: router, http, translate
│  │  ├─ app.routes.ts                  # /:lang guard + single page
│  │  ├─ app.component.ts               # shell: lang from route, music toggle
│  │  ├─ core/
│  │  │  ├─ wedding-config.ts           # TYPED config object (content+theme)
│  │  │  ├─ wedding-config.token.ts     # InjectionToken<WeddingConfig>
│  │  │  ├─ supabase.client.ts          # createClient(url, anonKey)
│  │  │  ├─ device-id.service.ts        # get/create localStorage device_id
│  │  │  ├─ name-normalize.ts           # Vietnamese-aware name_norm()
│  │  │  ├─ rsvp.service.ts             # insert rsvp+companions, check clash
│  │  │  ├─ wishes.service.ts           # insert wish, list public wishes
│  │  │  ├─ guests.service.ts           # autocomplete name lookup
│  │  │  └─ visit.service.ts            # call edge function to log visit
│  │  ├─ pages/
│  │  │  ├─ cover/cover.component.ts     # Page 1: "Mở thiệp" + start music
│  │  │  └─ invite/invite.component.ts   # Page 2: content sections
│  │  └─ components/
│  │     ├─ language-toggle/…            # 🌐 VI/EN
│  │     ├─ agenda/…                     # agenda list
│  │     ├─ map-calendar/…               # embed map + add-to-calendar
│  │     ├─ rsvp-form/…                  # the RSVP form + name-clash popup
│  │     ├─ companions-editor/…          # add/remove companions
│  │     ├─ wishes/…                     # wish input + public wall
│  │     └─ faq/…                        # Q&A accordion + gift QR answer
│  └─ assets/
│     ├─ i18n/vi.json, en.json           # translation strings
│     ├─ config/wedding.config.ts        # (imported) fake data for now
│     ├─ img/…                           # cover, couple photos, gift QRs
│     └─ audio/bg-music.mp3
├─ supabase/
│  ├─ migrations/0001_init.sql           # tables + view + RLS policies
│  └─ functions/log-visit/index.ts       # Edge Function: capture IP, insert
└─ docs/superpowers/…                    # spec + this plan
```

**Environment / secrets:** Supabase project URL + anon key are public-by-design (anon key is safe with RLS). Store them in `src/app/core/supabase.client.ts` as constants read from `wedding.config.ts` (`supabase: { url, anonKey }`). Never put the service-role key in the frontend.

---

## Task 0: Scaffold Angular app

**Files:**
- Create: whole Angular skeleton under `manhan/` (via CLI)
- Modify: `package.json`, `angular.json`

- [ ] **Step 1: Create the Angular app in the project root**

Run (from `C:\Users\Intelisys_Admin\Desktop\manhan`, which already has `.git` + `docs/`):
```bash
npx --yes @angular/cli@latest new manhan-web --directory . --routing --style scss --ssr false --skip-git --defaults
```
If the CLI refuses because the folder is non-empty, scaffold in a temp dir and copy `src/`, `angular.json`, `package.json`, `tsconfig*.json` into the project root.

- [ ] **Step 2: Verify the dev build runs**

Run: `npm start` (serves on http://localhost:4200)
Expected: default Angular welcome page loads with no console errors. Stop the server after confirming.

- [ ] **Step 3: Add libraries**

Run:
```bash
npm install @supabase/supabase-js @ngx-translate/core @ngx-translate/http-loader
```
Expected: installs with no peer-dependency errors.

- [ ] **Step 4: Run the default unit tests once (baseline)**

Run: `npm test -- --watch=false`
Expected: the default `app.component.spec.ts` passes (or is removed). Fix Chrome headless config if needed before proceeding.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold Angular app + install supabase/ngx-translate"
```

---

## Task 1: Typed wedding config + injection token

**Files:**
- Create: `src/app/core/wedding-config.ts`
- Create: `src/app/core/wedding-config.token.ts`
- Create: `src/assets/config/wedding.config.ts`
- Test: `src/app/core/wedding-config.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// wedding-config.spec.ts
import { WEDDING } from '../../assets/config/wedding.config';

describe('wedding config (fake data)', () => {
  it('has both names, one event, groups, gift QRs and faq', () => {
    expect(WEDDING.couple.bride).toBe('Nhật An');
    expect(WEDDING.couple.groom).toBe('Duy Mạnh');
    expect(WEDDING.event.name).toContain('Vu Quy');
    expect(WEDDING.rsvp.groups.length).toBeGreaterThan(0);
    expect(WEDDING.gift.bride.account).toBeTruthy();
    expect(WEDDING.gift.groom.account).toBeTruthy();
    expect(WEDDING.faq.length).toBeGreaterThanOrEqual(6);
    expect(WEDDING.supabase.url).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — cannot find module `wedding.config`.

- [ ] **Step 3: Define the config type**

```typescript
// src/app/core/wedding-config.ts
export interface Party { name: string; bank: string; account: string; qr: string; }
export interface FaqItem { qKey: string; aKey: string; showGiftQr?: boolean; }
export interface WeddingConfig {
  couple: { bride: string; groom: string };
  event: { name: string; venue: string; address: string; mapEmbedUrl: string;
           mapDirUrl: string; datetime: string; agendaKeys: string[] };
  rsvp: { groups: string[]; deadlineISO: string;
          bus: { pickup: string; departTime: string; duration: string } };
  gift: { bride: Party; groom: Party };
  faq: FaqItem[];
  theme: { primary: string; accent: string; fontHeading: string; fontBody: string; music: string };
  supabase: { url: string; anonKey: string };
  media: { coverImg: string; couplePhotos: string[] };
}
```

- [ ] **Step 4: Write the fake config**

```typescript
// src/assets/config/wedding.config.ts
import { WeddingConfig } from '../../app/core/wedding-config';

export const WEDDING: WeddingConfig = {
  couple: { bride: 'Nhật An', groom: 'Duy Mạnh' },
  event: {
    name: 'Lễ Vu Quy',
    venue: '[TÊN NHÀ HÀNG - DATA GIẢ]',
    address: '123 Đường ABC, Ninh Kiều, Cần Thơ [DATA GIẢ]',
    mapEmbedUrl: 'https://www.google.com/maps?q=Can+Tho&output=embed',
    mapDirUrl: 'https://www.google.com/maps/dir/?api=1&destination=Can+Tho',
    datetime: '2026-11-15T10:00:00+07:00',
    agendaKeys: ['agenda.welcome', 'agenda.ceremony', 'agenda.lunch', 'agenda.party'],
  },
  rsvp: {
    groups: ['Bạn nhà trai', 'Bạn nhà gái', 'Họ hàng nhà trai', 'Họ hàng nhà gái', 'IAS'],
    deadlineISO: '2026-10-10',
    bus: { pickup: '[Điểm đón HCM - DATA GIẢ]', departTime: '06:00 15/11/2026', duration: '~4 giờ' },
  },
  gift: {
    bride: { name: 'Nhật An', bank: 'VCB [GIẢ]', account: '0000000000', qr: 'assets/img/qr-bride.png' },
    groom: { name: 'Duy Mạnh', bank: 'TCB [GIẢ]', account: '1111111111', qr: 'assets/img/qr-groom.png' },
  },
  faq: [
    { qKey: 'faq.gift.q', aKey: 'faq.gift.a', showGiftQr: true },
    { qKey: 'faq.bus.q', aKey: 'faq.bus.a' },
    { qKey: 'faq.oneway.q', aKey: 'faq.oneway.a' },
    { qKey: 'faq.returnonly.q', aKey: 'faq.returnonly.a' },
    { qKey: 'faq.cantho.q', aKey: 'faq.cantho.a' },
    { qKey: 'faq.daklak.q', aKey: 'faq.daklak.a' },
  ],
  theme: { primary: '#9E1B1B', accent: '#C9A24B', fontHeading: 'serif', fontBody: 'sans-serif',
           music: 'assets/audio/bg-music.mp3' },
  supabase: { url: 'https://REPLACE.supabase.co', anonKey: 'REPLACE_ANON_KEY' },
  media: { coverImg: 'assets/img/cover.jpg', couplePhotos: ['assets/img/couple-1.jpg'] },
};
```

- [ ] **Step 5: Provide it via InjectionToken**

```typescript
// src/app/core/wedding-config.token.ts
import { InjectionToken } from '@angular/core';
import { WeddingConfig } from './wedding-config';
import { WEDDING } from '../../assets/config/wedding.config';

export const WEDDING_CONFIG = new InjectionToken<WeddingConfig>('WEDDING_CONFIG', {
  providedIn: 'root',
  factory: () => WEDDING,
});
```

- [ ] **Step 6: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: typed wedding config with fake data + injection token"
```

---

## Task 2: Vietnamese-aware name normalization

**Files:**
- Create: `src/app/core/name-normalize.ts`
- Test: `src/app/core/name-normalize.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { nameNorm } from './name-normalize';

describe('nameNorm', () => {
  it('lowercases, trims, collapses spaces', () => {
    expect(nameNorm('  Nguyễn   Văn  A ')).toBe('nguyen van a');
  });
  it('strips Vietnamese diacritics and maps đ→d', () => {
    expect(nameNorm('Đỗ Thị Hạnh')).toBe('do thi hanh');
    expect(nameNorm('DUY MẠNH')).toBe('duy manh');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — `name-normalize` not found.

- [ ] **Step 3: Implement**

```typescript
// src/app/core/name-normalize.ts
export function nameNorm(input: string): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip combining accents
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: Vietnamese-aware name normalization"
```

---

## Task 3: device_id service (localStorage)

**Files:**
- Create: `src/app/core/device-id.service.ts`
- Test: `src/app/core/device-id.service.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { DeviceIdService } from './device-id.service';

describe('DeviceIdService', () => {
  beforeEach(() => localStorage.clear());

  it('creates and persists a stable id', () => {
    const svc = new DeviceIdService();
    const first = svc.get();
    expect(first).toMatch(/^[0-9a-f-]{10,}$/);
    expect(new DeviceIdService().get()).toBe(first); // stable across instances
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — service not found.

- [ ] **Step 3: Implement**

```typescript
// src/app/core/device-id.service.ts
import { Injectable } from '@angular/core';

const KEY = 'manhan_device_id';

@Injectable({ providedIn: 'root' })
export class DeviceIdService {
  get(): string {
    let id = localStorage.getItem(KEY);
    if (!id) {
      id = (crypto.randomUUID?.() ?? Math.random().toString(16).slice(2) + Date.now().toString(16));
      localStorage.setItem(KEY, id);
    }
    return id;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: persistent localStorage device_id service"
```

---

## Task 4: Supabase schema, RLS, and rsvp_latest view

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Test: `supabase/tests/0001_init.verify.sql` (assertions run via `psql`/Supabase SQL editor)

> This task defines the DB. Verification is by running the SQL against a Supabase project (or local `supabase start`) and checking the assert queries return expected rows. No Angular test here.

- [ ] **Step 1: Write the schema + policies**

```sql
-- supabase/migrations/0001_init.sql
create table if not exists guests (
  id bigint generated always as identity primary key,
  full_name text not null,
  category text,
  expected_size int,
  notes text
);

create table if not exists rsvp (
  id bigint generated always as identity primary key,
  guest_name text not null,
  name_norm text not null,
  category text not null,
  status text not null check (status in ('self_transport','bus','cannot_attend')),
  phone text,
  party_size int not null default 1,
  matched_guest_id bigint references guests(id),
  device_id text,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists rsvp_name_norm_idx on rsvp (name_norm, created_at desc);

create table if not exists companions (
  id bigint generated always as identity primary key,
  rsvp_id bigint not null references rsvp(id) on delete cascade,
  name text not null,
  joins_bus boolean not null default false,
  relation text
);

create table if not exists wishes (
  id bigint generated always as identity primary key,
  name text not null,
  message text not null,
  is_public boolean not null default true,
  device_id text,
  ip text,
  created_at timestamptz not null default now()
);

create table if not exists page_visits (
  id bigint generated always as identity primary key,
  device_id text,
  ip text,
  visited_at timestamptz not null default now()
);

-- latest choice per person+device (accepts visible duplicates instead of
-- silently overwriting two different people who share a name — see spec §7)
create or replace view rsvp_latest as
select distinct on (name_norm, coalesce(device_id,'')) *
from rsvp
order by name_norm, coalesce(device_id,''), created_at desc, id desc;
-- id desc tiebreaker: created_at can tie when rows share a transaction
-- timestamp (now() is constant per tx); id is monotonic so latest wins deterministically

-- names appearing under >1 device_id → possible different people (or same person
-- on 2 devices); the couple reviews these manually via phone/group
create or replace view possible_duplicates as
select name_norm,
       count(distinct coalesce(device_id,'')) as device_count,
       array_agg(distinct guest_name) as names,
       array_agg(distinct category) as groups
from rsvp
group by name_norm
having count(distinct coalesce(device_id,'')) > 1;

-- public wishes wall (no ip/device leak)
create or replace view wishes_public as
select id, name, message, created_at from wishes where is_public = true;

-- autocomplete source: expose ONLY names (never category/notes)
create or replace view guests_public as
select full_name from guests;

-- correct bus-seat counts: only companions of the LATEST rsvp per person
-- (append-only means old rsvp rows still have their old companions; must exclude them)
create or replace view bus_manifest as
select r.guest_name, r.category, r.phone, c.name as companion_name, c.joins_bus
from rsvp_latest r
left join companions c on c.rsvp_id = r.id
where r.status = 'bus';

create or replace view bus_seat_count as
select
  (select count(*) from rsvp_latest where status = 'bus') as guest_seats,
  (select count(*) from companions c
     join rsvp_latest r on r.id = c.rsvp_id
     where c.joins_bus = true) as companion_seats;

-- RLS
alter table rsvp enable row level security;
alter table companions enable row level security;
alter table wishes enable row level security;
alter table page_visits enable row level security;
alter table guests enable row level security;

-- anon may INSERT responses but never SELECT the raw tables
grant insert on rsvp, companions, wishes to anon;
create policy rsvp_insert on rsvp for insert to anon with check (true);
create policy companions_insert on companions for insert to anon with check (true);
create policy wishes_insert on wishes for insert to anon with check (true);
-- (no SELECT policy on rsvp/companions/wishes/guests for anon → reads denied)

-- page_visits: only the Edge Function (service role) writes; anon has no access
revoke all on page_visits from anon;

-- anon may read ONLY the safe views
grant select on guests_public, wishes_public to anon;
-- do NOT grant rsvp_latest/bus_manifest/bus_seat_count/possible_duplicates to anon (admin-only)
```

- [ ] **Step 2: Write verification assertions**

```sql
-- supabase/tests/0001_init.verify.sql
-- Run after 0001_init.sql. Each SELECT should return the noted result.
-- same person, same (null) device, changes mind → latest wins, collapses to 1:
insert into rsvp (guest_name,name_norm,category,status) values ('A','a','IAS','bus');
insert into rsvp (guest_name,name_norm,category,status) values ('A','a','IAS','cannot_attend');
select count(*) as should_be_1 from rsvp_latest where name_norm='a';
select status as should_be_cannot_attend from rsvp_latest where name_norm='a';
-- TWO different devices, same name → BOTH kept (accepted dup, no data loss):
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','bus','dev-1');
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','bus','dev-2');
select count(*) as should_be_2 from rsvp_latest where name_norm='b';
-- same device re-submits → collapses to latest for that device (still 2 total):
insert into rsvp (guest_name,name_norm,category,status,device_id) values ('B','b','IAS','cannot_attend','dev-1');
select count(*) as still_2 from rsvp_latest where name_norm='b';
select status as dev1_should_be_cannot from rsvp_latest where name_norm='b' and device_id='dev-1';
-- possible_duplicates flags name_norm='b' (2 devices):
select device_count as should_be_2b from possible_duplicates where name_norm='b';
insert into wishes (name,message,is_public) values ('B','hi',false);
insert into wishes (name,message,is_public) values ('C','congrats',true);
-- wishes_public must exclude the private one:
select count(*) as should_be_1 from wishes_public;
-- bus-seat count must IGNORE companions of superseded rsvp rows (risk #5):
-- attach a bus companion to 'a's now-superseded bus row; latest status is cannot_attend
insert into companions (rsvp_id, name, joins_bus)
  select id, 'X', true from rsvp where name_norm='a' and status='bus';
select companion_seats as should_be_0 from bus_seat_count;
```

- [ ] **Step 3: Apply and verify**

Run in the Supabase project SQL editor (or `supabase db reset` locally):
1. Execute `0001_init.sql`.
2. Execute `supabase/tests/0001_init.verify.sql`.
Expected: `should_be_1 = 1`, `should_be_cannot_attend = cannot_attend`, `should_be_2 = 2` (two devices kept), `still_2 = 2`, `dev1_should_be_cannot = cannot_attend`, `should_be_2b = 2`, wishes `should_be_1 = 1`, and `should_be_0 = 0` (companion on the superseded bus row is NOT counted). Then delete the test rows.

- [ ] **Step 4: Verify RLS blocks anon reads (negative test — risk #1)**

Using the project's **anon** key (never the service key), a read of the raw tables MUST be denied:
```bash
curl -s "https://REPLACE.supabase.co/rest/v1/rsvp?select=*" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <ANON_KEY>"
```
Expected: `[]` (RLS hides all rows) — **not** the inserted rows. Repeat for `companions` and `page_visits` (also `[]` / error). Then confirm the safe views DO return data:
```bash
curl -s "https://REPLACE.supabase.co/rest/v1/guests_public?select=full_name" -H "apikey: <ANON_KEY>"
curl -s "https://REPLACE.supabase.co/rest/v1/wishes_public?select=*" -H "apikey: <ANON_KEY>"
```
Expected: these return rows. Also confirm `rsvp_latest` is **denied** to anon:
```bash
curl -s "https://REPLACE.supabase.co/rest/v1/rsvp_latest?select=*" -H "apikey: <ANON_KEY>"
```
Expected: `[]` or permission error. **If `rsvp` or `rsvp_latest` returns any real row, RLS is misconfigured — stop and fix before continuing.**

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/
git commit -m "feat: supabase schema, views (rsvp_latest/wishes_public/guests_public/bus_*), RLS"
```

---

## Task 5: Edge Function to log a visit with real IP

**Files:**
- Create: `supabase/functions/log-visit/index.ts`

> Deployed with `supabase functions deploy log-visit --no-verify-jwt`. It runs with the service role, so it can insert into `page_visits` (which anon cannot). Verification is by invoking the deployed URL.

- [ ] **Step 1: Implement the function**

```typescript
// supabase/functions/log-visit/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || null;
  let device_id: string | null = null;
  try { device_id = (await req.json())?.device_id ?? null; } catch { /* no body */ }
  await admin.from('page_visits').insert({ ip, device_id });
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'content-type': 'application/json' },
  });
});
```

- [ ] **Step 2: Deploy and verify**

Run:
```bash
supabase functions deploy log-visit --no-verify-jwt
curl -s -X POST "https://REPLACE.supabase.co/functions/v1/log-visit" \
  -H "content-type: application/json" -d '{"device_id":"test-dev"}'
```
Expected: response `{"ok":true}`; a new row appears in `page_visits` with `device_id='test-dev'` and an `ip`. Delete the test row afterward.

- [ ] **Step 3: Commit**

```bash
git add supabase/functions/
git commit -m "feat: log-visit edge function (real IP + device_id)"
```

---

## Task 6: Supabase client + data services (RSVP / wishes / guests / visit)

**Files:**
- Create: `src/app/core/supabase.client.ts`
- Create: `src/app/core/rsvp.service.ts`
- Create: `src/app/core/wishes.service.ts`
- Create: `src/app/core/guests.service.ts`
- Create: `src/app/core/visit.service.ts`
- Test: `src/app/core/rsvp.service.spec.ts`

> Services take the Supabase client as a constructor arg so tests inject a fake. `nameNorm` and `DeviceIdService` are reused (DRY).

- [ ] **Step 1: Write the failing test (RSVP submit shape + clash logic)**

```typescript
// rsvp.service.spec.ts
import { RsvpService, RsvpDraft } from './rsvp.service';

function fakeSupabase(existing: any[] = []) {
  const inserted: any[] = [];
  return {
    inserted,
    from(table: string) {
      return {
        insert: (rows: any) => { inserted.push({ table, rows });
          return { select: () => ({ single: async () => ({ data: { id: 99 }, error: null }) }) }; },
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({
          data: existing, error: null }) }) }) }),
      } as any;
    },
  } as any;
}

const draft: RsvpDraft = {
  guestName: 'Duy Mạnh', category: 'IAS', status: 'bus', phone: '0900',
  companions: [{ name: 'Vợ', joinsBus: true }], deviceId: 'dev-1',
};

describe('RsvpService', () => {
  it('normalizes name and inserts rsvp + companions with party_size', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);
    await svc.submit(draft);
    const rsvpRow = sb.inserted.find((i: any) => i.table === 'rsvp').rows;
    expect(rsvpRow.name_norm).toBe('duy manh');
    expect(rsvpRow.party_size).toBe(2); // guest + 1 companion
    expect(sb.inserted.some((i: any) => i.table === 'companions')).toBe(true);
  });

  it('flags a clash: same name+group+status, different device_id', async () => {
    const sb = fakeSupabase([{ device_id: 'other-dev', ip: '1.1.1.1' }]);
    const svc = new RsvpService(sb);
    const clash = await svc.checkClash(draft);
    expect(clash).toBe(true);
  });

  it('no clash when same device_id', async () => {
    const sb = fakeSupabase([{ device_id: 'dev-1', ip: '1.1.1.1' }]);
    const svc = new RsvpService(sb);
    expect(await svc.checkClash(draft)).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — `rsvp.service` not found.

- [ ] **Step 3: Implement the client + service**

```typescript
// src/app/core/supabase.client.ts
import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WEDDING } from '../../assets/config/wedding.config';

export const SUPABASE = new InjectionToken<SupabaseClient>('SUPABASE', {
  providedIn: 'root',
  factory: () => createClient(WEDDING.supabase.url, WEDDING.supabase.anonKey),
});
```

```typescript
// src/app/core/rsvp.service.ts
import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';
import { nameNorm } from './name-normalize';

export interface CompanionDraft { name: string; joinsBus: boolean; relation?: string; }
export interface RsvpDraft {
  guestName: string; category: string;
  status: 'self_transport' | 'bus' | 'cannot_attend';
  phone?: string; companions: CompanionDraft[]; deviceId: string;
}

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}

  async checkClash(d: RsvpDraft): Promise<boolean> {
    const norm = nameNorm(d.guestName);
    const { data } = await this.sb.from('rsvp').select('device_id,ip')
      .eq('name_norm', norm).eq('category', d.category).eq('status', d.status);
    const rows = data ?? [];
    return rows.length > 0 && rows.every(r => r.device_id !== d.deviceId);
  }

  async submit(d: RsvpDraft): Promise<void> {
    const partySize = 1 + d.companions.length;
    const { data, error } = await this.sb.from('rsvp').insert({
      guest_name: d.guestName, name_norm: nameNorm(d.guestName), category: d.category,
      status: d.status, phone: d.status === 'bus' ? (d.phone ?? null) : null,
      party_size: partySize, device_id: d.deviceId,
    }).select().single();
    if (error) throw error;
    if (d.companions.length) {
      await this.sb.from('companions').insert(
        d.companions.map(c => ({ rsvp_id: (data as any).id, name: c.name,
          joins_bus: c.joinsBus, relation: c.relation ?? null })));
    }
  }
}
```

```typescript
// src/app/core/wishes.service.ts
import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';

export interface WishDraft { name: string; message: string; isPublic: boolean; deviceId: string; }

@Injectable({ providedIn: 'root' })
export class WishesService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}
  async add(w: WishDraft) {
    const { error } = await this.sb.from('wishes').insert({
      name: w.name, message: w.message, is_public: w.isPublic, device_id: w.deviceId });
    if (error) throw error;
  }
  async listPublic() {
    const { data } = await this.sb.from('wishes_public').select('*').order('created_at', { ascending: false });
    return data ?? [];
  }
}
```

```typescript
// src/app/core/guests.service.ts
import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class GuestsService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}
  async suggest(prefix: string): Promise<string[]> {
    if (prefix.trim().length < 1) return [];
    const { data } = await this.sb.from('guests_public').select('full_name').ilike('full_name', `%${prefix}%`).limit(8);
    return (data ?? []).map((r: any) => r.full_name);
  }
}
```

```typescript
// src/app/core/visit.service.ts
import { Injectable } from '@angular/core';
import { WEDDING } from '../../assets/config/wedding.config';

@Injectable({ providedIn: 'root' })
export class VisitService {
  async log(deviceId: string): Promise<void> {
    try {
      await fetch(`${WEDDING.supabase.url}/functions/v1/log-visit`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ device_id: deviceId }),
      });
    } catch { /* visit logging is best-effort */ }
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS (all 3 RsvpService tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: supabase client + rsvp/wishes/guests/visit services"
```

---

## Task 7: i18n setup + language routing

**Files:**
- Create: `src/assets/i18n/vi.json`, `src/assets/i18n/en.json`
- Modify: `src/app/app.config.ts`, `src/app/app.routes.ts`, `src/app/app.component.ts`
- Test: `src/app/app.routes.spec.ts`

- [ ] **Step 1: Write the failing test (Option C: root = vi, /en = en)**

```typescript
// app.routes.spec.ts
import { routes } from './app.routes';

describe('routes (Option C)', () => {
  it('root path is Vietnamese (no redirect, no prefix)', () => {
    const root = routes.find(r => r.path === '');
    expect(root?.data?.['lang']).toBe('vi');
    expect(root?.redirectTo).toBeUndefined();
  });
  it('/en path is English', () => {
    const en = routes.find(r => r.path === 'en');
    expect(en?.data?.['lang']).toBe('en');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — routes shape doesn't match.

- [ ] **Step 3: Define routes**

```typescript
// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { InviteComponent } from './pages/invite/invite.component';

export const routes: Routes = [
  { path: '', component: InviteComponent, data: { lang: 'vi' } },
  { path: 'en', component: InviteComponent, data: { lang: 'en' } },
  { path: '**', redirectTo: '' },
];
```

- [ ] **Step 4: Configure translate + providers**

```typescript
// src/app/app.config.ts
import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(TranslateModule.forRoot({
      defaultLanguage: 'vi',
      loader: { provide: TranslateLoader,
        useFactory: (http: HttpClient) => new TranslateHttpLoader(http, 'assets/i18n/', '.json'),
        deps: [HttpClient] },
    })),
  ],
};
```

- [ ] **Step 5: Minimal shell (language is set in InviteComponent from route data — Task 15)**

```typescript
// src/app/app.component.ts
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root', standalone: true, imports: [RouterOutlet],
  template: `<router-outlet />`,
})
export class AppComponent {}
```

- [ ] **Step 6: Seed translation files (VI real-ish, EN placeholder)**

```json
// src/assets/i18n/vi.json
{
  "cover": { "open": "Mở thiệp" },
  "invite": { "invite_you": "Trân trọng kính mời", "confirm": "Xác nhận tham dự",
              "agenda": "Chương trình" },
  "agenda": { "welcome": "Đón khách", "ceremony": "Nghi lễ", "lunch": "Dùng tiệc", "party": "Chung vui" },
  "rsvp": { "your_name": "Tên của bạn", "group": "Bạn thuộc nhóm", "add_companion": "Thêm người đi cùng",
            "joins_bus": "Đi xe", "self_transport": "Đồng ý & tự túc xe",
            "bus": "Đồng ý & đăng ký xe HCM–Cần Thơ", "cannot_attend": "Không thể tham dự",
            "phone": "Số điện thoại", "note_change": "Bạn có thể quay lại nhập tên và chọn lại bất cứ lúc nào — hệ thống lấy lựa chọn cuối cùng.",
            "deadline_passed": "Đã qua hạn xác nhận — gia đình có thể đã chốt số lượng, mong bạn thông cảm.",
            "clash_title": "Có khách trùng tên trong nhóm này",
            "clash_body": "Đã có một người cùng tên trong nhóm này xác nhận trước đó. Nếu là bạn, bấm Tiếp tục. Nếu là người khác, vui lòng thêm chi tiết vào tên để phân biệt.",
            "edit_name": "Sửa tên", "continue": "Tiếp tục", "submit": "Gửi xác nhận", "thanks": "Cảm ơn bạn!" },
  "wishes": { "title": "Gửi lời chúc", "public": "Công khai", "private": "Ẩn",
              "placeholder": "Lời chúc của bạn…", "send": "Gửi", "wall": "Lời chúc từ mọi người" },
  "faq": { "title": "Hỏi & Đáp",
           "gift": { "q": "Gửi tiền mừng online được không?", "a": "Bạn có thể chuyển khoản qua mã QR bên dưới." },
           "bus": { "q": "Lịch trình xe đưa đón thế nào?", "a": "(Thông tin sẽ cập nhật sau.)" },
           "oneway": { "q": "Nếu chỉ đi HCM → Cần Thơ, không quay về?", "a": "(Cập nhật sau.)" },
           "returnonly": { "q": "Nếu chỉ ké chiều về HCM?", "a": "(Cập nhật sau.)" },
           "cantho": { "q": "Cần Thơ có gì chơi?", "a": "(Cập nhật sau.)" },
           "daklak": { "q": "Đắk Lắk có gì chơi?", "a": "(Cập nhật sau.)" } }
}
```

```json
// src/assets/i18n/en.json
{
  "cover": { "open": "Open invitation" },
  "invite": { "invite_you": "We cordially invite", "confirm": "RSVP", "agenda": "Schedule" },
  "agenda": { "welcome": "Welcome", "ceremony": "Ceremony", "lunch": "Banquet", "party": "Celebration" },
  "rsvp": { "your_name": "Your name", "group": "Your group", "add_companion": "Add companion",
            "joins_bus": "On the bus", "self_transport": "Yes — own transport",
            "bus": "Yes — book the HCM–Can Tho bus", "cannot_attend": "Cannot attend",
            "phone": "Phone number", "note_change": "You can re-enter your name and choose again anytime — the latest choice counts.",
            "deadline_passed": "The RSVP deadline has passed — numbers may be finalized; thank you for understanding.",
            "clash_title": "Someone with the same name in this group",
            "clash_body": "Someone with the same name already responded. If it's you, tap Continue. Otherwise, please add detail to your name.",
            "edit_name": "Edit name", "continue": "Continue", "submit": "Submit", "thanks": "Thank you!" },
  "wishes": { "title": "Send your wishes", "public": "Public", "private": "Hidden",
              "placeholder": "Your wishes…", "send": "Send", "wall": "Wishes from guests" },
  "faq": { "title": "Q&A",
           "gift": { "q": "Can I send a gift online?", "a": "You can transfer via the QR codes below." },
           "bus": { "q": "What's the shuttle schedule?", "a": "(To be updated.)" },
           "oneway": { "q": "What if I only go HCM → Can Tho, no return?", "a": "(To be updated.)" },
           "returnonly": { "q": "What if I only need the return leg to HCM?", "a": "(To be updated.)" },
           "cantho": { "q": "What to do in Can Tho?", "a": "(To be updated.)" },
           "daklak": { "q": "What to do in Dak Lak?", "a": "(To be updated.)" } }
}
```

- [ ] **Step 7: Run to verify tests pass + app builds**

Run: `npm test -- --watch=false` then `npm run build`
Expected: routes test PASSES; production build succeeds.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: i18n (vi/en) + language routing"
```

---

## Task 8: Language toggle component

**Files:**
- Create: `src/app/components/language-toggle/language-toggle.component.ts`
- Test: `src/app/components/language-toggle/language-toggle.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageToggleComponent } from './language-toggle.component';

describe('LanguageToggleComponent (Option C)', () => {
  it('links vi→/en and en→/ (root is Vietnamese)', async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageToggleComponent], providers: [provideRouter([])],
    }).compileComponents();
    const c = TestBed.createComponent(LanguageToggleComponent).componentInstance;
    c.current = 'vi';
    expect(c.otherLink).toBe('/en');
    expect(c.otherLabel).toBe('EN');
    c.current = 'en';
    expect(c.otherLink).toBe('/');
    expect(c.otherLabel).toBe('VI');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// language-toggle.component.ts
import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-language-toggle', standalone: true, imports: [RouterLink],
  template: `<a [routerLink]="otherLink" class="lang-toggle">🌐 {{ otherLabel }}</a>`,
  styles: [`.lang-toggle{position:fixed;top:.5rem;right:.5rem;z-index:20;text-decoration:none}`],
})
export class LanguageToggleComponent {
  @Input() current: 'vi' | 'en' = 'vi';
  // Option C: Vietnamese lives at the root '/', English at '/en'
  get otherLink(): string { return this.current === 'vi' ? '/en' : '/'; }
  get otherLabel(): string { return this.current === 'vi' ? 'EN' : 'VI'; }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: language toggle component"
```

---

## Task 9: Cover page (Page 1) + music start

**Files:**
- Create: `src/app/pages/cover/cover.component.ts`
- Test: `src/app/pages/cover/cover.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { CoverComponent } from './cover.component';

describe('CoverComponent', () => {
  it('emits opened when the button is clicked (starts music+scroll)', async () => {
    await TestBed.configureTestingModule({ imports: [CoverComponent] }).compileComponents();
    const f = TestBed.createComponent(CoverComponent);
    let opened = false;
    f.componentInstance.opened.subscribe(() => (opened = true));
    f.detectChanges();
    (f.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(opened).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// cover.component.ts
import { Component, EventEmitter, Output, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-cover', standalone: true, imports: [TranslateModule],
  template: `
    <section class="cover">
      <h1>{{ cfg.couple.bride }} &amp; {{ cfg.couple.groom }}</h1>
      <button (click)="opened.emit()">{{ 'cover.open' | translate }}</button>
    </section>`,
  styles: [`.cover{min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;gap:2rem}`],
})
export class CoverComponent {
  @Output() opened = new EventEmitter<void>();
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: cover page with Open-invitation button"
```

---

## Task 10: Companions editor component

**Files:**
- Create: `src/app/components/companions-editor/companions-editor.component.ts`
- Test: `src/app/components/companions-editor/companions-editor.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { CompanionsEditorComponent } from './companions-editor.component';

describe('CompanionsEditorComponent', () => {
  it('adds and removes companions and emits the list', async () => {
    await TestBed.configureTestingModule({ imports: [CompanionsEditorComponent] }).compileComponents();
    const c = TestBed.createComponent(CompanionsEditorComponent).componentInstance;
    const emitted: any[] = [];
    c.changed.subscribe(v => emitted.push(v));
    c.add(); c.rows[0].name = 'Vợ'; c.rows[0].joinsBus = true; c.emit();
    expect(emitted.at(-1)).toEqual([{ name: 'Vợ', joinsBus: true, relation: '' }]);
    c.remove(0); c.emit();
    expect(emitted.at(-1)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// companions-editor.component.ts
import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { CompanionDraft } from '../../core/rsvp.service';

@Component({
  selector: 'app-companions-editor', standalone: true, imports: [FormsModule, TranslateModule],
  template: `
    @for (row of rows; track $index) {
      <div class="row">
        <input [(ngModel)]="row.name" (ngModelChange)="emit()" placeholder="Tên">
        <label><input type="checkbox" [(ngModel)]="row.joinsBus" (ngModelChange)="emit()">
          {{ 'rsvp.joins_bus' | translate }}</label>
        <button type="button" (click)="remove($index); emit()">✕</button>
      </div>
    }
    <button type="button" (click)="add(); emit()">+ {{ 'rsvp.add_companion' | translate }}</button>`,
})
export class CompanionsEditorComponent {
  rows: CompanionDraft[] = [];
  @Output() changed = new EventEmitter<CompanionDraft[]>();
  add() { this.rows.push({ name: '', joinsBus: false, relation: '' }); }
  remove(i: number) { this.rows.splice(i, 1); }
  emit() { this.changed.emit(this.rows.filter(r => r.name.trim().length > 0)); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: companions editor component"
```

---

## Task 11: RSVP form component (name autocomplete, group, bus info, clash popup)

**Files:**
- Create: `src/app/components/rsvp-form/rsvp-form.component.ts`
- Test: `src/app/components/rsvp-form/rsvp-form.component.spec.ts`

- [ ] **Step 1: Write the failing test (validation + submit path)**

```typescript
import { TestBed } from '@angular/core/testing';
import { RsvpFormComponent } from './rsvp-form.component';
import { RsvpService } from '../../core/rsvp.service';
import { GuestsService } from '../../core/guests.service';
import { DeviceIdService } from '../../core/device-id.service';
import { TranslateModule } from '@ngx-translate/core';

class RsvpStub { clash = false; submitted: any = null;
  checkClash = async () => this.clash; submit = async (d: any) => { this.submitted = d; }; }
class GuestsStub { suggest = async () => ['Duy Mạnh']; }

describe('RsvpFormComponent', () => {
  let rsvp: RsvpStub;
  beforeEach(async () => {
    rsvp = new RsvpStub();
    await TestBed.configureTestingModule({
      imports: [RsvpFormComponent, TranslateModule.forRoot()],
      providers: [
        { provide: RsvpService, useValue: rsvp },
        { provide: GuestsService, useValue: new GuestsStub() },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } },
      ],
    }).compileComponents();
  });

  it('requires name, group, and status before submit', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    expect(c.valid()).toBe(false);
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    expect(c.valid()).toBe(true);
  });

  it('requires phone when status is bus', () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'A'; c.model.category = 'IAS'; c.model.status = 'bus';
    expect(c.valid()).toBe(false);
    c.model.phone = '0900';
    expect(c.valid()).toBe(true);
  });

  it('shows clash popup instead of submitting when clash detected', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    rsvp.clash = true;
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    await c.trySubmit();
    expect(c.showClash).toBe(true);
    expect(rsvp.submitted).toBeNull();
  });

  it('confirming past the clash submits', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    rsvp.clash = true;
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    await c.trySubmit();
    await c.confirmDespiteClash();
    expect(rsvp.submitted?.guestName).toBe('Duy Mạnh');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// rsvp-form.component.ts
import { Component, Inject, inject, Input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { RsvpService, RsvpDraft, CompanionDraft } from '../../core/rsvp.service';
import { GuestsService } from '../../core/guests.service';
import { DeviceIdService } from '../../core/device-id.service';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';
import { CompanionsEditorComponent } from '../companions-editor/companions-editor.component';

@Component({
  selector: 'app-rsvp-form', standalone: true,
  imports: [FormsModule, TranslateModule, CompanionsEditorComponent],
  templateUrl: './rsvp-form.component.html',
})
export class RsvpFormComponent {
  private rsvp = inject(RsvpService);
  private guests = inject(GuestsService);
  private device = inject(DeviceIdService);
  @Input() lang: 'vi' | 'en' = 'vi';

  model: { guestName: string; category: string;
           status: '' | 'self_transport' | 'bus' | 'cannot_attend'; phone: string } =
    { guestName: '', category: '', status: '', phone: '' };
  companions: CompanionDraft[] = [];
  suggestions: string[] = [];
  showBusInfo = false;
  showClash = false;
  done = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  get deadlinePassed(): boolean { return new Date() > new Date(this.cfg.rsvp.deadlineISO); }

  async onNameInput() { this.suggestions = await this.guests.suggest(this.model.guestName); }

  valid(): boolean {
    if (!this.model.guestName.trim() || !this.model.category || !this.model.status) return false;
    if (this.model.status === 'bus' && !this.model.phone.trim()) return false;
    return true;
  }

  private draft(): RsvpDraft {
    return { guestName: this.model.guestName, category: this.model.category,
      status: this.model.status as any, phone: this.model.phone,
      companions: this.companions, deviceId: this.device.get() };
  }

  async trySubmit() {
    if (!this.valid()) return;
    if (await this.rsvp.checkClash(this.draft())) { this.showClash = true; return; }
    await this.rsvp.submit(this.draft());
    this.done = true;
  }

  async confirmDespiteClash() {
    this.showClash = false;
    await this.rsvp.submit(this.draft());
    this.done = true;
  }
}
```

```html
<!-- rsvp-form.component.html -->
@if (done) {
  <p class="thanks">{{ 'rsvp.thanks' | translate }}</p>
} @else {
  <form (ngSubmit)="trySubmit()">
    @if (deadlinePassed) { <p class="warn">{{ 'rsvp.deadline_passed' | translate }}</p> }

    <label>{{ 'rsvp.your_name' | translate }}
      <input name="name" [(ngModel)]="model.guestName" (ngModelChange)="onNameInput()"
             list="guest-suggest" autocomplete="off" required>
      <datalist id="guest-suggest">
        @for (s of suggestions; track s) { <option [value]="s"></option> }
      </datalist>
    </label>

    <label>{{ 'rsvp.group' | translate }}
      <select name="group" [(ngModel)]="model.category" required>
        <option value="" disabled selected></option>
        @for (g of cfg.rsvp.groups; track g) { <option [value]="g">{{ g }}</option> }
      </select>
    </label>

    <app-companions-editor (changed)="companions = $event"></app-companions-editor>

    <fieldset>
      <label><input type="radio" name="st" value="self_transport" [(ngModel)]="model.status">
        {{ 'rsvp.self_transport' | translate }}</label>
      <label><input type="radio" name="st" value="bus" [(ngModel)]="model.status">
        {{ 'rsvp.bus' | translate }}
        <button type="button" (click)="showBusInfo = !showBusInfo" aria-label="info">ⓘ</button></label>
      @if (showBusInfo) {
        <div class="bus-info">
          <p>{{ cfg.rsvp.bus.pickup }} · {{ cfg.rsvp.bus.departTime }} · {{ cfg.rsvp.bus.duration }}</p>
          <label>{{ 'rsvp.phone' | translate }}
            <input name="phone" [(ngModel)]="model.phone" inputmode="tel"></label>
        </div>
      }
      <label><input type="radio" name="st" value="cannot_attend" [(ngModel)]="model.status">
        {{ 'rsvp.cannot_attend' | translate }}</label>
    </fieldset>

    <p class="note">{{ 'rsvp.note_change' | translate }}</p>
    <button type="submit" [disabled]="!valid()">{{ 'rsvp.submit' | translate }}</button>
  </form>

  @if (showClash) {
    <div class="modal">
      <h3>{{ 'rsvp.clash_title' | translate }}</h3>
      <p>{{ 'rsvp.clash_body' | translate }}</p>
      <button type="button" (click)="showClash = false">{{ 'rsvp.edit_name' | translate }}</button>
      <button type="button" (click)="confirmDespiteClash()">{{ 'rsvp.continue' | translate }}</button>
    </div>
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS (all 4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: RSVP form with autocomplete, bus info, clash popup"
```

---

## Task 12: Wishes component (input + public wall)

**Files:**
- Create: `src/app/components/wishes/wishes.component.ts`
- Test: `src/app/components/wishes/wishes.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { WishesComponent } from './wishes.component';
import { WishesService } from '../../core/wishes.service';
import { DeviceIdService } from '../../core/device-id.service';
import { TranslateModule } from '@ngx-translate/core';

class WishesStub { added: any = null; list = [{ id: 1, name: 'X', message: 'hi' }];
  add = async (w: any) => { this.added = w; };
  listPublic = async () => this.list; }

describe('WishesComponent', () => {
  let stub: WishesStub;
  beforeEach(async () => {
    stub = new WishesStub();
    await TestBed.configureTestingModule({
      imports: [WishesComponent, TranslateModule.forRoot()],
      providers: [
        { provide: WishesService, useValue: stub },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } },
      ],
    }).compileComponents();
  });

  it('loads public wishes on init', async () => {
    const f = TestBed.createComponent(WishesComponent);
    await f.componentInstance.ngOnInit();
    expect(f.componentInstance.wall.length).toBe(1);
  });

  it('submits a wish then reloads the wall', async () => {
    const c = TestBed.createComponent(WishesComponent).componentInstance;
    c.name = 'Me'; c.message = 'Chúc mừng'; c.isPublic = true;
    await c.send();
    expect(stub.added).toEqual({ name: 'Me', message: 'Chúc mừng', isPublic: true, deviceId: 'dev-1' });
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// wishes.component.ts
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { WishesService } from '../../core/wishes.service';
import { DeviceIdService } from '../../core/device-id.service';

@Component({
  selector: 'app-wishes', standalone: true, imports: [FormsModule, TranslateModule],
  template: `
    <section class="wishes">
      <h2>{{ 'wishes.title' | translate }}</h2>
      <input [(ngModel)]="name" placeholder="{{ 'rsvp.your_name' | translate }}">
      <textarea [(ngModel)]="message" placeholder="{{ 'wishes.placeholder' | translate }}"></textarea>
      <label><input type="radio" [value]="true" [(ngModel)]="isPublic"> {{ 'wishes.public' | translate }}</label>
      <label><input type="radio" [value]="false" [(ngModel)]="isPublic"> {{ 'wishes.private' | translate }}</label>
      <button type="button" [disabled]="!name.trim() || !message.trim()" (click)="send()">
        {{ 'wishes.send' | translate }}</button>

      <h3>{{ 'wishes.wall' | translate }}</h3>
      @for (w of wall; track w.id) { <blockquote><b>{{ w.name }}</b>: {{ w.message }}</blockquote> }
    </section>`,
})
export class WishesComponent implements OnInit {
  private svc = inject(WishesService);
  private device = inject(DeviceIdService);
  name = ''; message = ''; isPublic = true;
  wall: any[] = [];
  async ngOnInit() { this.wall = await this.svc.listPublic(); }
  async send() {
    await this.svc.add({ name: this.name, message: this.message, isPublic: this.isPublic,
      deviceId: this.device.get() });
    this.name = ''; this.message = '';
    this.wall = await this.svc.listPublic();
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: wishes input + public wall"
```

---

## Task 13: FAQ accordion + gift QR

**Files:**
- Create: `src/app/components/faq/faq.component.ts`
- Test: `src/app/components/faq/faq.component.spec.ts`

- [ ] **Step 1: Write the failing test**

```typescript
import { TestBed } from '@angular/core/testing';
import { FaqComponent } from './faq.component';
import { TranslateModule } from '@ngx-translate/core';

describe('FaqComponent', () => {
  it('toggles a panel open/closed and marks the gift item', async () => {
    await TestBed.configureTestingModule({
      imports: [FaqComponent, TranslateModule.forRoot()] }).compileComponents();
    const c = TestBed.createComponent(FaqComponent).componentInstance;
    expect(c.openIndex).toBe(-1);
    c.toggle(0);
    expect(c.openIndex).toBe(0);
    c.toggle(0);
    expect(c.openIndex).toBe(-1);
    expect(c.items[0].showGiftQr).toBe(true); // first item is the gift question
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// faq.component.ts
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig, FaqItem } from '../../core/wedding-config';

@Component({
  selector: 'app-faq', standalone: true, imports: [TranslateModule],
  template: `
    <section class="faq">
      <h2>{{ 'faq.title' | translate }}</h2>
      @for (item of items; track $index) {
        <div class="qa">
          <button type="button" (click)="toggle($index)">{{ item.qKey | translate }}</button>
          @if (openIndex === $index) {
            <div class="answer">
              <p>{{ item.aKey | translate }}</p>
              @if (item.showGiftQr) {
                <div class="gift">
                  <figure><img [src]="cfg.gift.bride.qr" alt="QR"><figcaption>
                    {{ cfg.gift.bride.name }} · {{ cfg.gift.bride.bank }} · {{ cfg.gift.bride.account }}</figcaption></figure>
                  <figure><img [src]="cfg.gift.groom.qr" alt="QR"><figcaption>
                    {{ cfg.gift.groom.name }} · {{ cfg.gift.groom.bank }} · {{ cfg.gift.groom.account }}</figcaption></figure>
                </div>
              }
            </div>
          }
        </div>
      }
    </section>`,
})
export class FaqComponent {
  items: FaqItem[];
  openIndex = -1;
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) { this.items = cfg.faq; }
  toggle(i: number) { this.openIndex = this.openIndex === i ? -1 : i; }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: FAQ accordion with gift QR panel"
```

---

## Task 14: Map + add-to-calendar component

**Files:**
- Create: `src/app/components/map-calendar/map-calendar.component.ts`
- Test: `src/app/components/map-calendar/map-calendar.component.spec.ts`

- [ ] **Step 1: Write the failing test (Google Calendar URL + .ics build)**

```typescript
import { TestBed } from '@angular/core/testing';
import { MapCalendarComponent } from './map-calendar.component';
import { TranslateModule } from '@ngx-translate/core';

describe('MapCalendarComponent', () => {
  it('builds a Google Calendar link and an ICS blob string', async () => {
    await TestBed.configureTestingModule({
      imports: [MapCalendarComponent, TranslateModule.forRoot()] }).compileComponents();
    const c = TestBed.createComponent(MapCalendarComponent).componentInstance;
    expect(c.googleCalUrl()).toContain('calendar.google.com');
    expect(c.googleCalUrl()).toContain('dates=');
    const ics = c.icsText();
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement**

```typescript
// map-calendar.component.ts
import { Component, Inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-map-calendar', standalone: true, imports: [TranslateModule],
  template: `
    <section class="map-cal">
      <iframe [src]="safeMap" width="100%" height="260" style="border:0" loading="lazy"></iframe>
      <a [href]="cfg.event.mapDirUrl" target="_blank" rel="noopener">Chỉ đường</a>
      <a [href]="googleCalUrl()" target="_blank" rel="noopener">Google Calendar</a>
      <a [href]="icsHref()" download="wedding.ics">Apple / .ics</a>
    </section>`,
})
export class MapCalendarComponent {
  safeMap: SafeResourceUrl;
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig, san: DomSanitizer) {
    this.safeMap = san.bypassSecurityTrustResourceUrl(cfg.event.mapEmbedUrl);
  }
  private stamps() {
    const start = new Date(this.cfg.event.datetime);
    const end = new Date(start.getTime() + 3 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return { s: fmt(start), e: fmt(end) };
  }
  googleCalUrl(): string {
    const { s, e } = this.stamps();
    const p = new URLSearchParams({ action: 'TEMPLATE',
      text: `${this.cfg.event.name} — ${this.cfg.couple.bride} & ${this.cfg.couple.groom}`,
      dates: `${s}/${e}`, location: this.cfg.event.address });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
  icsText(): string {
    const { s, e } = this.stamps();
    return ['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT',
      `SUMMARY:${this.cfg.event.name}`, `DTSTART:${s}`, `DTEND:${e}`,
      `LOCATION:${this.cfg.event.address}`, 'END:VEVENT','END:VCALENDAR'].join('\r\n');
  }
  icsHref(): string { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(this.icsText()); }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: map embed + google calendar + ics"
```

---

## Task 15: Invite page (Page 2) wiring everything + music + visit log

**Files:**
- Create: `src/app/pages/invite/invite.component.ts`
- Create: `src/app/pages/invite/invite.component.html`
- Test: `src/app/pages/invite/invite.component.spec.ts`

- [ ] **Step 1: Write the failing test (cover→content toggle + visit logged once)**

```typescript
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InviteComponent } from './invite.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { TranslateModule } from '@ngx-translate/core';

class VisitStub { count = 0; log = async () => { this.count++; }; }

describe('InviteComponent', () => {
  let visit: VisitStub;
  beforeEach(async () => {
    visit = new VisitStub();
    await TestBed.configureTestingModule({
      imports: [InviteComponent, TranslateModule.forRoot()],
      providers: [ provideRouter([]),
        { provide: VisitService, useValue: visit },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } } ],
    }).compileComponents();
  });

  it('logs a visit on init and starts hidden (cover showing)', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(visit.count).toBe(1);
    expect(f.componentInstance.opened).toBe(false);
  });

  it('open() reveals content', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    c.open();
    expect(c.opened).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm test -- --watch=false`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the page**

```typescript
// invite.component.ts
import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CoverComponent } from '../cover/cover.component';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';
import { RsvpFormComponent } from '../../components/rsvp-form/rsvp-form.component';
import { WishesComponent } from '../../components/wishes/wishes.component';
import { FaqComponent } from '../../components/faq/faq.component';
import { MapCalendarComponent } from '../../components/map-calendar/map-calendar.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-invite', standalone: true,
  imports: [TranslateModule, CoverComponent, LanguageToggleComponent, RsvpFormComponent,
            WishesComponent, FaqComponent, MapCalendarComponent],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit {
  private visit = inject(VisitService);
  private device = inject(DeviceIdService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  @ViewChild('audio') audio?: ElementRef<HTMLAudioElement>;
  opened = false;
  lang: 'vi' | 'en' = 'vi';

  async ngOnInit() {
    // Option C: lang comes from route data ({ lang: 'vi' } at '/', { lang: 'en' } at '/en')
    this.lang = this.route.snapshot.data['lang'] === 'en' ? 'en' : 'vi';
    this.translate.use(this.lang);
    await this.visit.log(this.device.get());
  }
  open() {
    this.opened = true;
    this.audio?.nativeElement.play().catch(() => { /* autoplay may still block */ });
  }
}
```

```html
<!-- invite.component.html -->
<app-language-toggle [current]="lang"></app-language-toggle>
<audio #audio [src]="'assets/audio/bg-music.mp3'" loop></audio>

@if (!opened) {
  <app-cover (opened)="open()"></app-cover>
} @else {
  <main class="invite">
    <app-map-calendar></app-map-calendar>
    <app-rsvp-form [lang]="lang"></app-rsvp-form>
    <app-wishes></app-wishes>
    <app-faq></app-faq>
  </main>
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm test -- --watch=false`
Expected: PASS. Then `npm run build` — production build succeeds.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: invite page wiring cover, map, rsvp, wishes, faq + visit log"
```

---

## Task 16: Manual local smoke test (real Supabase, dev server)

**Files:** none (verification task)

> Fill `wedding.config.ts` `supabase.url/anonKey` with the real project values from Task 4/5 before running. Keep them in the committed config — anon key is public-safe.

- [ ] **Step 1: Serve and click through**

Run: `npm start` and open http://localhost:4200/ (Vietnamese root)
- [ ] Cover shows; clicking "Mở thiệp" reveals content and starts music.
- [ ] Language toggle: from `/` shows Vietnamese; clicking it navigates to `/en` and content switches to English; from `/en` the toggle returns to `/`.
- [ ] Submit an RSVP with a companion + bus + phone → row in `rsvp` + `companions`; `party_size` correct.
- [ ] Re-submit the same name/group/status from the same browser → no popup (same device_id).
- [ ] In a different browser/incognito, submit identical name/group/status → clash popup appears.
- [ ] Post a public wish → appears on the wall; post a private wish → does NOT appear on the wall.
- [ ] Open the FAQ "gift" item → both QR images + account info show.
- [ ] Confirm a row appears in `page_visits` with an `ip`.

- [ ] **Step 2: Fix any issues found, re-run, then commit config**

```bash
git add src/assets/config/wedding.config.ts
git commit -m "chore: wire real Supabase url + anon key"
```

- [ ] **Step 3: PRE-LAUNCH GATE — replace ALL fake data (risk #2)**

⚠️ **Do NOT deploy to production or print the invitation QR until every `DATA GIẢ` / `[GIẢ]` / `REPLACE` placeholder is replaced with real values.** Wrong gift QR/bank details = guests transferring money to a non-existent/wrong account.
Checklist — grep the repo and confirm none remain:
```bash
grep -rn "GIẢ\|REPLACE\|placeholder\|0000000000\|1111111111" src/assets/config/
```
Expected: **no matches** before go-live. Specifically verify:
- [ ] Gift QR images (`qr-bride.png`, `qr-groom.png`) are the REAL VietQR images, and `bank`/`account`/`name` are correct.
- [ ] Event venue, address, `mapEmbedUrl`, `mapDirUrl`, `datetime` are real.
- [ ] Bus pickup/time/duration, RSVP groups, deadline are real.
- [ ] Cover + couple photos are real; `bg-music.mp3` is the chosen track.
- [ ] Q&A "(cập nhật sau)" answers filled (or intentionally left as "will update").
- [ ] `supabase.url`/`anonKey` point to the real project (anon key only — never the service key).

---

## Task 17: GitHub Pages deploy (404 fallback + Actions)

**Files:**
- Create: `.github/workflows/deploy.yml`
- Create: `src/404.html` build step (copied from index)
- Modify: `angular.json` (ensure `baseHref` `/`)

> Prereq: create a GitHub org named `manh-an-wedding` (verify the name is free) and a repo `manh-an-wedding.github.io`; set repo Settings → Pages → Source = GitHub Actions. Push this repo there.

- [ ] **Step 1: Add the deploy workflow**

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages
on:
  push: { branches: [main] }
permissions: { contents: read, pages: write, id-token: write }
concurrency: { group: pages, cancel-in-progress: true }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: npm }   # Angular 22 needs Node >= 22.22.3
      - run: npm ci
      - run: npx ng build --base-href /
      - name: SPA fallback (404 = index)
        run: cp dist/*/browser/index.html dist/*/browser/404.html
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist/manhan-web/browser }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: "${{ steps.deployment.outputs.page_url }}" }
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```
Adjust the `path:` to match the actual folder under `dist/` (check `angular.json` → `projects.<name>.architect.build.options.outputPath`).

- [ ] **Step 2: Verify the build output path locally**

Run: `npx ng build --base-href /`
Expected: output under `dist/manhan-web/browser/` containing `index.html`. Confirm the folder name and update `deploy.yml` `path:`/`cp` globs to match.

- [ ] **Step 3: Push and let Actions deploy**

```bash
git add -A
git commit -m "ci: GitHub Pages deploy with SPA 404 fallback"
git remote add origin git@github.com:manh-an-wedding/manh-an-wedding.github.io.git
git push -u origin main
```
Expected: the Actions run goes green; site live at `https://manh-an-wedding.github.io`.

- [ ] **Step 4: Verify the live deep link**

Open `https://manh-an-wedding.github.io/en` directly (not via homepage) to exercise the SPA fallback on a deep link.
Expected: the invitation loads in English (404.html fallback works); the root `https://manh-an-wedding.github.io` loads Vietnamese; music/RSVP/wishes/FAQ all function against Supabase.

---

## Task 18: Open Graph prerender for link previews

**Files:**
- Modify: `src/index.html` (static OG tags — good enough for a single page)

> Because there is only ONE page, static OG tags in `index.html` cover the preview without full SSG. (Multi-route SSG is out of scope — see spec §13.)

- [ ] **Step 1: Add OG meta to `index.html` `<head>`**

```html
<meta property="og:title" content="Thiệp cưới Nhật An & Duy Mạnh">
<meta property="og:description" content="Trân trọng kính mời bạn đến chung vui — Lễ Vu Quy">
<meta property="og:image" content="https://manh-an-wedding.github.io/assets/img/cover.jpg">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
```

- [ ] **Step 2: Verify after deploy**

Paste `https://manh-an-wedding.github.io` into Facebook Sharing Debugger (or a Zalo chat) and confirm the preview shows the title + cover image.

- [ ] **Step 3: Commit**

```bash
git add src/index.html
git commit -m "feat: Open Graph tags for link preview"
```

---

## Task 19: Guest list Excel importer (one-time seed)

**Files:**
- Create: `scripts/import-guests.md` (documented manual procedure)

> The Excel → `guests` seed is a one-time operation, not app code. Use Supabase Dashboard's CSV import.

- [ ] **Step 1: Document the import procedure**

```markdown
# Import guest list → Supabase `guests`
1. In the Excel file, keep columns: Họ và tên, Nhóm/Category, Số người dự kiến, Ghi chú.
2. Save as CSV (UTF-8): full_name, category, expected_size, notes.
3. Supabase Dashboard → Table Editor → guests → Import data from CSV.
4. Map columns: full_name→full_name, category→category, expected_size→expected_size, notes→notes.
5. Verify row count matches the sheet; spot-check a name appears in the app's autocomplete.
```

- [ ] **Step 2: Commit**

```bash
git add scripts/import-guests.md
git commit -m "docs: one-time guest list CSV import procedure"
```

---

## Self-Review Notes (author checklist — done)

- **Spec coverage:** cover/invite pages (T9/T15), 3 RSVP options + companions + bus + phone (T10/T11), name clash via device_id (T6/T11), wishes public/private + wall (T12), Q&A + gift QR (T13), map + calendar (T14), i18n VI/EN + toggle (T7/T8), append-only rsvp + `rsvp_latest` (T4), visit/IP via Edge Function (T5/T15), guests autocomplete + import (T6/T19), RLS + negative read test (T4), GitHub Pages + 404 + base-href (T17), Open Graph (T18). Admin/export (spec §9) deferred to Supabase Dashboard — the `bus_seat_count`/`bus_manifest` views (T4) give the couple correct seat totals directly; revisit if an in-app admin page is later wanted.
- **Risk mitigations folded in:** #1 RLS negative test (T4 Step 4) + `guests_public`/`wishes_public` views so anon never touches raw tables; #2 pre-launch "replace fake data" gate (T16 Step 3); #5 `bus_seat_count`/`bus_manifest` count only companions of the latest rsvp per person, with a regression assertion in the verify SQL.
- **Language = Option C:** Vietnamese at root `/` (no prefix), English at `/en`; routes carry `data.lang`, `InviteComponent` sets `TranslateService.use()`, toggle links `/`↔`/en` (T7/T8/T15).
- **Identity accepts duplicates:** `rsvp_latest` keyed on `(name_norm, device_id)` so two same-named people are never silently overwritten; `possible_duplicates` view surfaces names spanning multiple devices for manual review (T4). Verify SQL asserts both the collapse (same device) and the keep-both (two devices) cases.
- **Placeholders:** all "DATA GIẢ" markers are intentional fake content in config, not plan gaps; every code step is complete.
- **Type consistency:** `RsvpDraft`/`CompanionDraft` defined in T6 and reused in T10/T11; `WeddingConfig`/`FaqItem` defined in T1 and reused in T13/T14; `nameNorm`, `DeviceIdService`, `VisitService`, `WishesService`, `GuestsService`, `RsvpService` names consistent across tasks.
