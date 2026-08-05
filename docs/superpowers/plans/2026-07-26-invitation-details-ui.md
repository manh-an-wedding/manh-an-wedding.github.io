# Invitation Details UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render the configured families, Vu Quy ceremony, and reception on the invitation page, show the groom before the bride, and use the supplied Vạn Phát Riverside Maps link.

**Architecture:** Keep confirmed content in `WeddingConfig` and make `InviteComponent` a presentational composition of those values. Migrate `MapCalendarComponent` from the transitional `event` object to `reception` so directions, calendar dates, venue, and couple-name order come from one source.

**Tech Stack:** Angular 22 standalone components, TypeScript 6, SCSS, ngx-translate 18, Vitest

## Global Constraints

- Vietnamese remains at `/`; English remains at `/en`.
- Display the groom before the bride everywhere.
- Directions use `https://maps.app.goo.gl/of7FJD3HC6WWPuv7A`.
- Wishes and FAQ remain hidden.
- All four photo positions continue to reuse `assets/img/demo-couple.png`.
- Work in the current checkout because the requested config changes are uncommitted on `main`.

---

### Task 1: Make reception map and calendar use the confirmed reception

**Files:**
- Modify: `src/assets/config/wedding.config.ts`
- Modify: `src/app/components/map-calendar/map-calendar.component.ts`
- Modify: `src/app/components/map-calendar/map-calendar.component.spec.ts`
- Test: `src/app/core/wedding-config.spec.ts`

**Interfaces:**
- Consumes: `WeddingConfig.reception`
- Produces: directions link, Google Calendar URL, and ICS event based on the reception

- [ ] **Step 1: Add failing behavior tests**

Add tests that assert:

```typescript
expect(WEDDING.reception.mapDirUrl)
  .toBe('https://maps.app.goo.gl/of7FJD3HC6WWPuv7A');

const calendar = new URL(component.googleCalUrl());
expect(calendar.searchParams.get('text'))
  .toBe('Tiệc cưới — Duy Mạnh & Nhật An');
expect(calendar.searchParams.get('location'))
  .toBe('Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ');
```

Render the map component and assert its first action link uses the same short
Maps URL.

- [ ] **Step 2: Run the full suite and verify RED**

Run:

```bash
npm test -- --watch=false
```

Expected: FAIL because the configured directions URL and calendar couple order
still use the old values.

- [ ] **Step 3: Apply the minimal map/calendar fix**

Set both `reception.mapDirUrl` and the transitional `event.mapDirUrl` to the
provided short URL. Update `MapCalendarComponent` to use:

```typescript
cfg.reception.mapEmbedUrl
cfg.reception.mapDirUrl
cfg.reception.datetime
cfg.reception.calendarDurationHours
cfg.reception.name
cfg.reception.address
`${cfg.couple.groom} & ${cfg.couple.bride}`
```

- [ ] **Step 4: Run the suite and verify GREEN**

Run:

```bash
npm test -- --watch=false
```

Expected: all tests pass.

### Task 2: Render family, ceremony, reception, and photo sections

**Files:**
- Modify: `src/app/pages/invite/invite.component.html`
- Modify: `src/app/pages/invite/invite.component.ts`
- Modify: `src/app/pages/invite/invite.component.spec.ts`
- Modify: `src/styles.scss`
- Modify: `public/assets/i18n/vi.json`
- Modify: `public/assets/i18n/en.json`

**Interfaces:**
- Consumes: `cfg.families`, `cfg.ceremony`, `cfg.reception`, `cfg.media.photos`
- Produces: visible `.families`, `.ceremony-card`, `.reception-card`, and `.photo-panel` sections

- [ ] **Step 1: Add a failing rendered-page test**

Render `InviteComponent` and assert:

```typescript
const heroNames = element.querySelector('.names').textContent;
expect(heroNames.indexOf('Duy Mạnh')).toBeLessThan(heroNames.indexOf('Nhật An'));
expect(element.querySelector('.families').textContent).toContain('Lê Duy Thâm');
expect(element.querySelector('.families').textContent).toContain('Tống Thị Bắc');
expect(element.querySelector('.ceremony-card').textContent).toContain('09:00');
expect(element.querySelector('.ceremony-card').textContent)
  .toContain('phường Bình Thủy, TP Cần Thơ');
expect(element.querySelector('.reception-card').textContent).toContain('10:15');
expect(element.querySelector('.reception-card').textContent).toContain('11:00');
expect(element.querySelector('.reception-card').textContent)
  .toContain('Sảnh 01 - Vạn Phát Riverside');
expect(element.querySelectorAll('.photo-panel')).toHaveLength(3);
expect(element.querySelector('audio').getAttribute('src')).toBe(cfg.theme.music);
```

- [ ] **Step 2: Run the suite and verify RED**

Run:

```bash
npm test -- --watch=false
```

Expected: FAIL because the page currently renders none of the configured detail
sections and places the bride first.

- [ ] **Step 3: Implement the invitation sections**

Import `TranslatePipe`. Render the hero as groom then bride and bind the audio
source to `cfg.theme.music`. After the hero, render:

1. invitation introduction;
2. groom/bride family cards;
3. first photo panel;
4. Vu Quy card with fixed `+0700` date formatting;
5. reception card with 10:15 welcome and 11:00 start;
6. map/calendar actions;
7. two remaining photo panels;
8. RSVP;
9. existing conditional Wishes and FAQ components.

- [ ] **Step 4: Add translated labels**

Add `details` keys to both locale files for family headings, parents, ceremony,
reception, welcome time, start time, lunar date, venue, and RSVP introduction.
Confirmed names, addresses, and event values stay in config.

- [ ] **Step 5: Add responsive editorial styling**

Style `.invitation-intro`, `.families`, `.family-card`, `.ceremony-card`,
`.reception-card`, `.event-time-grid`, and `.photo-panel`. Preserve the current
ivory, burgundy, and gold theme; family cards use two columns above 560 px and
stack below it.

- [ ] **Step 6: Run final verification**

Run:

```bash
npm test -- --watch=false
npm run build
git diff --check
```

Expected: all tests pass, production build succeeds, and only the existing
bundle-size warning remains.
