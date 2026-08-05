# Cover Hero and Closing Album Design

Date: 2026-07-26  
Status: Approved design, awaiting written-spec review

## Goal

Replace the current heading-above-photo opening with a photo-first invitation
cover. Restyle the information inside the invitation using the formal,
center-aligned hierarchy of the supplied reference while preserving the current
burgundy, ivory, and gold palette.

All non-cover photos move into one album section at the end of the page.

## Cover Hero

The first viewport begins with the configured cover image. There is no separate
names/date block above it.

Text is layered directly over the photo:

- `Duy Mạnh & Nhật An`
- `Thư mời`
- `11:00 · 17/10/2026`
- `Vạn Phát Riverside`

The groom remains before the bride. The text uses a restrained shadow and a
bottom gradient so it remains legible on light or busy photography. On narrow
screens the cover fills the available width and keeps a portrait aspect ratio.
The full image remains visible where practical; `object-position` can be
adjusted through styling when real wedding photography replaces the demo image.

The language and music controls remain floating above the cover.

## Inner Invitation Layout

The information flow follows the formal, centered composition of the second
reference, without adopting its dark-green palette:

1. Two family columns at the top:
   - groom's parents and the shortened address `Ea Ktur, Đắk Lắk`;
   - bride's parents and the shortened address `Bình Thủy, Cần Thơ`.
2. Centered announcement copy.
3. Groom name, ampersand, and bride name on separate display lines.
4. Vu Quy ceremony:
   - 09:00;
   - 17/10/2026;
   - lunar date;
   - bride's family home;
   - phường Bình Thủy, TP Cần Thơ.
5. Reception:
   - guest welcome at 10:15;
   - reception begins at 11:00;
   - 17/10/2026;
   - Sảnh 01 - Vạn Phát Riverside;
   - confirmed restaurant address.
6. Map and calendar actions.
7. RSVP form.
8. Closing album.

Sections use centered typography, thin gold dividers, generous whitespace, and
date/time groupings rather than the current collection of independent cards.
The two family columns stack on small screens.

## Album

Remove all three photo panels currently placed between content sections.

Add one `Album` section after RSVP and before the hidden optional sections. It
reads `cfg.media.photos`, supports one to four images, and uses:

- one image: a single full-width portrait;
- two images: one large image followed by one secondary image;
- three or four images: a simple responsive editorial grid.

For the current demo, the same supplied image appears in all configured slots.
The album must tolerate missing or failed images without leaving empty layout
gaps.

Wishes and FAQ remain hidden after the album through the existing section
toggles.

## Data and Translation

The cover and inner layout read existing `WeddingConfig` values. No confirmed
wedding facts are duplicated in component code.

Add translation keys for:

- cover invitation label;
- album heading;
- the centered family/ceremony/reception labels used by the new composition.

Names, times, dates, venue, addresses, map link, and section toggles remain in
the typed config.

## Verification

Automated tests verify:

- no standalone name/date block appears above the cover;
- cover overlay shows groom before bride and the four confirmed invitation
  lines;
- family, ceremony, reception, map, and RSVP sections retain their content;
- no interstitial `.photo-panel` elements remain;
- the closing album renders all configured photos;
- Wishes and FAQ remain hidden.

Visual checks cover `/` and `/en` at mobile and desktop widths, with no
horizontal overflow and no browser-console errors.
