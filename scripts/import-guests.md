# Import guest list → Supabase `guests` (one-time seed)

The Excel guest list is a one-time input to enable name autocomplete + the
"invited vs confirmed" reconciliation. After import, the database is the source
of truth.

1. In the Excel file, keep these columns: **Họ và tên, Nhóm/Category, Số người dự kiến, Ghi chú**.
2. Save as CSV (UTF-8) with headers renamed to: `full_name, category, expected_size, notes`.
3. Supabase Dashboard → Table Editor → `guests` → **Import data from CSV**.
4. Map columns: `full_name→full_name`, `category→category`, `expected_size→expected_size`, `notes→notes`.
5. Verify the row count matches the sheet; spot-check that a name appears in the app's
   name autocomplete (the app reads the `guests_public` view, which exposes only `full_name`).
