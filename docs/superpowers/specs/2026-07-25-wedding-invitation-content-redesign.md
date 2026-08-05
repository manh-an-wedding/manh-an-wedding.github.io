# Wedding Invitation Content Redesign

Date: 2026-07-25  
Status: Approved design, awaiting written-spec review

## 1. Goal

Redesign the existing wedding invitation as a mobile-first, vertically scrolling
invitation inspired by the supplied Cinelove reference. The page should feel like
a refined printed invitation without copying the reference exactly or depending
on a large photo set.

The redesign must:

- separate the Vu Quy ceremony from the reception invitation;
- show the two families and the ceremony details clearly;
- keep the current bilingual routes, RSVP form, map, calendar, music control,
  Supabase integration, and config-driven architecture;
- use one supplied sample image in every planned photo position for the first
  review;
- keep Wishes and FAQ hidden;
- fix defects encountered in the affected RSVP and invitation flows.

## 2. Confirmed Wedding Information

### Couple

- Groom: Lê Duy Mạnh
- Bride: Lê Thị Nhật An
- Display names: Duy Mạnh and Nhật An

### Groom's family

- Father: Lê Duy Thâm
- Mother: Nguyễn Thị Anh
- Address: Ea Ktur, Cư Kuin, Đắk Lắk

### Bride's family

- Father: Lê Văn Nam
- Mother: Tống Thị Bắc
- Address: 30A/7, hẻm 6 Bùi Hữu Nghĩa, phường Bình Thủy, TP. Cần Thơ

### Vu Quy ceremony

- Time: 09:00, 17 October 2026
- Lunar date: 08 September, year of Bính Ngọ
- Place: the bride's family home
- Public display location: phường Bình Thủy, TP Cần Thơ

The full street address belongs to the family information. The ceremony card
uses only the shortened public display location requested above.

### Reception

- Guest reception: 10:15, 17 October 2026
- Meal/ceremony start: 11:00, 17 October 2026
- Venue: Sảnh 01 - Vạn Phát Riverside
- Address: Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ
- Lunar date: 08 September, year of Bính Ngọ

## 3. Page Structure

The page remains one invitation route rendered at `/` in Vietnamese and `/en`
in English.

Content order:

1. Floating language and music controls.
2. Hero photo with couple names, event label, and 17.10.2026.
3. Short invitation introduction.
4. Two-family section:
   - Nhà Trai with both parents and the Đắk Lắk address;
   - Nhà Gái with both parents and the Cần Thơ address.
5. Photo interlude using the supplied sample image.
6. Vu Quy ceremony card with its time, lunar date, private-home label, and
   shortened location.
7. Reception invitation card with the 10:15 welcome time, 11:00 start time,
   venue, and full restaurant address.
8. Map and add-to-calendar actions for the reception.
9. Photo interlude using the same sample image.
10. RSVP section.
11. Closing photo panel using the same sample image during the first review.

Wishes and FAQ remain implemented but hidden via the existing section flags.

## 4. Visual Direction

Use a narrow, editorial invitation column with generous vertical rhythm. The
visual language takes cues from the supplied reference:

- warm ivory paper background;
- deep burgundy panels;
- muted gold rules and ornaments;
- serif display typography paired with a legible Vietnamese sans serif;
- alternating light invitation sections and dark reception cards;
- subtle borders, rounded corners, and restrained shadows;
- decorative calendar-style date treatment where it improves hierarchy;
- responsive two-column family layout that stacks on narrow screens.

The page must remain readable without any photo. Images use fixed aspect-ratio
containers with `object-fit: cover`, helpful alternative text, and graceful
error handling.

For the first implementation, copy the supplied image to a public demo asset and
reference that same asset in all four planned positions: hero, first interlude,
second interlude, and closing panel. The media configuration remains an array so
one to four real photos can replace it later without changing component markup.

## 5. Configuration and Component Boundaries

Extend `WeddingConfig` with explicit data structures rather than embedding event
text in templates:

- `families.groom` and `families.bride`;
- `ceremony` with time, ISO datetime, lunar date, place label, and display
  location;
- `reception` with welcome time, start datetime, lunar date, venue, address, map
  URLs, and calendar duration;
- `media.photos`, supporting one to four paths.

The invitation page composes focused presentational sections:

- family information;
- ceremony details;
- reception details;
- reusable photo panel;
- existing map/calendar and RSVP components.

The map and calendar component reads the reception configuration. It no longer
assumes that the only event date represents both the ceremony and reception.
The music element reads `cfg.theme.music` rather than a hardcoded path.

## 6. RSVP and Supabase Corrections

The current client attempts to select from the raw `rsvp` table when checking a
name clash and uses `insert().select()` to obtain a new RSVP ID. The existing RLS
rules intentionally deny anonymous reads, so the live flow can fail even though
unit tests with mocked clients pass.

Add a new Supabase migration with narrowly scoped `SECURITY DEFINER` RPC
functions:

- a clash check that returns only a boolean and never exposes RSVP rows;
- an atomic RSVP submission function that inserts the RSVP and companions and
  returns only the new RSVP ID or a success result.

Both functions set a fixed `search_path`, validate required values, and grant
execution only to the intended public role. Raw table `SELECT` remains denied.

The Angular RSVP service calls these RPCs. The form gains:

- submitting state to prevent double submission;
- translated failure feedback;
- error handling for name suggestions and RSVP requests;
- unchanged clash confirmation behavior.

## 7. Targeted Cleanup

Within the files touched by this work:

- remove the unused Angular starter `app.html`;
- use configured media and music paths;
- correct the event date from the old placeholder date to 17 October 2026;
- correct the venue name to `Sảnh 01 - Vạn Phát Riverside`;
- preserve `sections: { wishes: false, faq: false }`;
- retain the user's uncommitted RSVP groups and bus details unless they conflict
  with confirmed event information.

Gift account and QR placeholders remain hidden with the FAQ and are outside this
content pass. They must still be replaced before enabling FAQ.

## 8. Testing and Verification

Unit tests cover:

- the extended config structure and confirmed dates;
- family, ceremony, and reception rendering;
- welcome time and reception time as distinct values;
- map/calendar links based on the reception;
- one-photo and missing-photo behavior;
- Wishes and FAQ remaining hidden;
- configured music source;
- RPC-based clash and RSVP submission;
- loading, duplicate-submit prevention, and visible error state.

Verification includes:

- all Angular unit tests;
- production build;
- placeholder scan of all visible invitation content;
- responsive browser smoke test at phone and desktop widths;
- direct `/en` route smoke test;
- Supabase migration verification covering denied raw reads and successful RPC
  execution.

The supplied sample image is intentionally temporary demo content and is not a
launch asset.
