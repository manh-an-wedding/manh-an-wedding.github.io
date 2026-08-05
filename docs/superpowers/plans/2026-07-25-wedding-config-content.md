# Wedding Config Content Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Store the confirmed family, Vu Quy, reception, and sample-photo data in the typed wedding configuration while keeping the current page functional.

**Architecture:** Add focused family, ceremony, and reception interfaces to `WeddingConfig`. Keep the existing `event` and media fields during the UI transition, but align them with the reception and point every temporary image slot at one demo asset.

**Tech Stack:** Angular 22, TypeScript 6, Vitest

## Global Constraints

- The Vietnamese route remains `/`; the English route remains `/en`.
- Wishes and FAQ remain disabled.
- The ceremony location shown on its event card is only `phường Bình Thủy, TP Cần Thơ`.
- The reception venue is exactly `Sảnh 01 - Vạn Phát Riverside`.
- The sample image is temporary and is reused in all four photo positions.
- Preserve the user's uncommitted RSVP groups and bus details.

---

### Task 1: Add typed family and event configuration

**Files:**
- Modify: `src/app/core/wedding-config.ts`
- Modify: `src/app/core/wedding-config.spec.ts`

**Interfaces:**
- Produces: `FamilyInfo`, `CeremonyInfo`, `ReceptionInfo`
- Produces: `WeddingConfig.families`, `WeddingConfig.ceremony`, `WeddingConfig.reception`
- Produces: `WeddingConfig.media.photos: string[]`

- [ ] **Step 1: Write a failing configuration test**

Add assertions that require:

```typescript
expect(WEDDING.families.groom.father).toBe('Lê Duy Thâm');
expect(WEDDING.families.bride.mother).toBe('Tống Thị Bắc');
expect(WEDDING.ceremony.datetime).toBe('2026-10-17T09:00:00+07:00');
expect(WEDDING.ceremony.address).toBe('phường Bình Thủy, TP Cần Thơ');
expect(WEDDING.reception.welcomeTime).toBe('10:15');
expect(WEDDING.reception.datetime).toBe('2026-10-17T11:00:00+07:00');
expect(WEDDING.reception.venue).toBe('Sảnh 01 - Vạn Phát Riverside');
expect(WEDDING.media.photos).toHaveLength(4);
expect(new Set(WEDDING.media.photos).size).toBe(1);
expect(WEDDING.sections).toEqual({ wishes: false, faq: false });
```

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
npm test -- --watch=false src/app/core/wedding-config.spec.ts
```

Expected: FAIL because the new configuration properties do not exist.

- [ ] **Step 3: Add the configuration interfaces**

Define:

```typescript
export interface FamilyInfo {
  father: string;
  mother: string;
  address: string;
}

export interface CeremonyInfo {
  name: string;
  datetime: string;
  lunarDate: string;
  venue: string;
  address: string;
}

export interface ReceptionInfo {
  name: string;
  welcomeTime: string;
  datetime: string;
  lunarDate: string;
  venue: string;
  address: string;
  mapEmbedUrl: string;
  mapDirUrl: string;
  calendarDurationHours: number;
}
```

Extend `WeddingConfig` with:

```typescript
families: { groom: FamilyInfo; bride: FamilyInfo };
ceremony: CeremonyInfo;
reception: ReceptionInfo;
media: { coverImg: string; couplePhotos: string[]; photos: string[] };
```

- [ ] **Step 4: Run the focused test to confirm the expected type failure has moved to the config object**

Run:

```bash
npm test -- --watch=false src/app/core/wedding-config.spec.ts
```

Expected: FAIL because `WEDDING` does not yet provide the required fields.

### Task 2: Populate confirmed content and sample media

**Files:**
- Modify: `src/assets/config/wedding.config.ts`
- Create: `public/assets/img/demo-couple.png`
- Test: `src/app/core/wedding-config.spec.ts`

**Interfaces:**
- Consumes: `FamilyInfo`, `CeremonyInfo`, `ReceptionInfo`
- Produces: a complete `WEDDING: WeddingConfig`

- [ ] **Step 1: Copy the supplied sample image**

Copy:

```text
C:\Users\INTELI~1\AppData\Local\Temp\codex-clipboard-c5489854-3441-4e6d-b7f8-9b2af9fcc7f1.png
```

to:

```text
public/assets/img/demo-couple.png
```

- [ ] **Step 2: Populate family information**

Add:

```typescript
families: {
  groom: {
    father: 'Lê Duy Thâm',
    mother: 'Nguyễn Thị Anh',
    address: 'Ea Ktur, Cư Kuin, Đắk Lắk',
  },
  bride: {
    father: 'Lê Văn Nam',
    mother: 'Tống Thị Bắc',
    address: '30A/7, hẻm 6 Bùi Hữu Nghĩa, phường Bình Thủy, TP Cần Thơ',
  },
},
```

- [ ] **Step 3: Populate ceremony information**

Add:

```typescript
ceremony: {
  name: 'Lễ Vu Quy',
  datetime: '2026-10-17T09:00:00+07:00',
  lunarDate: '08 tháng 09 năm Bính Ngọ',
  venue: 'Tư gia nhà gái',
  address: 'phường Bình Thủy, TP Cần Thơ',
},
```

- [ ] **Step 4: Populate reception information**

Add:

```typescript
reception: {
  name: 'Tiệc cưới',
  welcomeTime: '10:15',
  datetime: '2026-10-17T11:00:00+07:00',
  lunarDate: '08 tháng 09 năm Bính Ngọ',
  venue: 'Sảnh 01 - Vạn Phát Riverside',
  address: 'Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ',
  mapEmbedUrl: 'https://www.google.com/maps?q=Van+Phat+Riverside+Can+Tho&output=embed',
  mapDirUrl: 'https://www.google.com/maps/dir/?api=1&destination=Van+Phat+Riverside+Can+Tho',
  calendarDurationHours: 3,
},
```

Update the transitional `event` values to match this reception so the current
map/calendar UI does not show the old November date.

- [ ] **Step 5: Configure all temporary photo slots**

Use:

```typescript
media: {
  coverImg: 'assets/img/demo-couple.png',
  couplePhotos: ['assets/img/demo-couple.png'],
  photos: Array(4).fill('assets/img/demo-couple.png'),
},
```

Keep:

```typescript
sections: { wishes: false, faq: false },
```

- [ ] **Step 6: Run the focused test**

Run:

```bash
npm test -- --watch=false src/app/core/wedding-config.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Run full verification**

Run:

```bash
npm test -- --watch=false
npm run build
```

Expected: all tests pass and the production build succeeds. The existing bundle
budget warning is acceptable; compilation errors are not.

- [ ] **Step 8: Review the diff without committing unrelated config changes**

Run:

```bash
git diff --check
git status --short
```

Expected: the existing user-edited RSVP groups and bus details remain present.
