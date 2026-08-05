# Cover Hero and Closing Album Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the opening into a photo cover with Vietnamese invitation text, restyle the inner invitation as a formal centered composition, and move all non-cover photos into one closing album.

**Architecture:** Keep all confirmed facts in `WeddingConfig`. `InviteComponent` renders one cover hero, one continuous information composition, the existing map and RSVP, then an album sourced from `cfg.media.photos`.

**Tech Stack:** Angular 22 standalone components, TypeScript 6, SCSS, ngx-translate 18, Vitest

## Global Constraints

- Default `/` interface text is Vietnamese; `/en` remains available.
- Groom `Duy Mạnh` is displayed before bride `Nhật An`.
- Cover text is `Duy Mạnh & Nhật An`, `Thư mời`, `11:00 · 17/10/2026`, and `Vạn Phát Riverside`.
- Groom-family display address is `Ea Ktur, Đắk Lắk`.
- Bride-family display address is `Bình Thủy, Cần Thơ`.
- Wishes and FAQ remain hidden.
- Current demo photos may repeat the same image.

---

### Task 1: Shorten the family display addresses

**Files:**
- Modify: `src/assets/config/wedding.config.ts`
- Test: `src/app/core/wedding-config.spec.ts`

**Interfaces:**
- Produces: `cfg.families.groom.address` and `cfg.families.bride.address`

- [ ] **Step 1: Add failing assertions**

```typescript
expect(WEDDING.families.groom.address).toBe('Ea Ktur, Đắk Lắk');
expect(WEDDING.families.bride.address).toBe('Bình Thủy, Cần Thơ');
```

- [ ] **Step 2: Run the suite and verify RED**

Run `npm test -- --watch=false`.

Expected: the two assertions fail with the longer current addresses.

- [ ] **Step 3: Update only the two family display addresses**

Leave the reception address and map location unchanged.

- [ ] **Step 4: Run the suite and verify GREEN**

Run `npm test -- --watch=false`.

Expected: all tests pass.

### Task 2: Replace the opening with a photo cover

**Files:**
- Modify: `src/app/pages/invite/invite.component.html`
- Modify: `src/app/pages/invite/invite.component.spec.ts`
- Modify: `src/styles.scss`
- Modify: `public/assets/i18n/vi.json`
- Modify: `public/assets/i18n/en.json`

**Interfaces:**
- Consumes: `cfg.media.coverImg`, `cfg.couple`, `cfg.reception`
- Produces: `.cover-hero`, `.cover-overlay`, `.cover-couple`, `.cover-invitation`

- [ ] **Step 1: Add a failing rendered-cover test**

Assert:

```typescript
const cover = element.querySelector('.cover-hero');
expect(cover?.textContent).toContain('Duy Mạnh');
expect(cover?.textContent).toContain('Nhật An');
expect(cover?.textContent).toContain('Thư mời');
expect(cover?.textContent).toContain('11:00');
expect(cover?.textContent).toContain('17/10/2026');
expect(cover?.textContent).toContain('Vạn Phát Riverside');
expect(element.querySelector('.hero > .names')).toBeNull();
```

- [ ] **Step 2: Run the suite and verify RED**

Run `npm test -- --watch=false`.

Expected: FAIL because `.cover-hero` does not exist.

- [ ] **Step 3: Implement the cover**

Replace the current heading-above-image hero with a portrait image and overlay.
Use a gradient at the bottom, gold/ivory text, and a compact top-right couple
name treatment. Keep language and music buttons above the cover.

- [ ] **Step 4: Restyle the inner invitation**

Remove independent card shadows from the family, ceremony, and reception
blocks. Use one centered ivory composition with gold dividers and the existing
burgundy/gold typography. Preserve all confirmed content and the map/RSVP order.

- [ ] **Step 5: Run the suite and verify GREEN**

Run `npm test -- --watch=false`.

Expected: all tests pass.

### Task 3: Move all secondary photos into the closing album

**Files:**
- Modify: `src/app/pages/invite/invite.component.html`
- Modify: `src/app/pages/invite/invite.component.ts`
- Modify: `src/app/pages/invite/invite.component.spec.ts`
- Modify: `src/styles.scss`
- Modify: `public/assets/i18n/vi.json`
- Modify: `public/assets/i18n/en.json`

**Interfaces:**
- Consumes: `cfg.media.photos`
- Produces: `.album`, `.album-grid`, `photoFailed(index: number)`, `isPhotoVisible(index: number)`

- [ ] **Step 1: Add failing album tests**

Assert:

```typescript
expect(element.querySelectorAll('.photo-panel')).toHaveLength(0);
expect(element.querySelector('.album')).not.toBeNull();
expect(element.querySelectorAll('.album-grid img'))
  .toHaveLength(component.cfg.media.photos.length);
expect(element.textContent).toContain('Album');
```

Dispatch an `error` event on one album image and assert that its wrapper is
removed while the remaining images stay visible.

- [ ] **Step 2: Run the suite and verify RED**

Run `npm test -- --watch=false`.

Expected: FAIL because the page still has interstitial photo panels and no
album.

- [ ] **Step 3: Implement album state and markup**

Use a `Set<number>` in `InviteComponent`:

```typescript
failedPhotoIndexes = new Set<number>();
photoFailed(index: number) {
  this.failedPhotoIndexes.add(index);
}
isPhotoVisible(index: number) {
  return !this.failedPhotoIndexes.has(index);
}
```

Render the album after RSVP, before conditional Wishes/FAQ. Add translation key
`details.album` with Vietnamese value `Album`.

- [ ] **Step 4: Style the responsive album**

One photo spans the full width. Two photos use a two-column grid above 560 px.
Three or four photos use a simple editorial grid; all images use consistent
rounded borders and `object-fit: cover`.

- [ ] **Step 5: Run final verification**

Run:

```bash
npm test -- --watch=false
npm run build
git diff --check
```

Then smoke-test `/` and `/en` at mobile width, checking no horizontal overflow
and no console errors.
