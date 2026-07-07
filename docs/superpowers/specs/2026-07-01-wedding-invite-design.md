# Thiệp cưới online — Nhật An ❤ Duy Mạnh — Design Spec

Ngày: 2026-07-01
Trạng thái: Bản thiết kế chờ duyệt (chưa code)
Thư mục dự án: `C:\Users\Intelisys_Admin\Desktop\manhan`

> **Lưu ý dữ liệu:** Thông tin thật (tên đầy đủ, ngày giờ, địa điểm 2 lễ, agenda, STK/QR, nhạc, nội dung Q&A) **chưa chốt** → giai đoạn đầu dùng **DATA GIẢ (placeholder)**, thay bằng data thật sau qua file config.

---

## 1. Mục tiêu

Web thiệp cưới cho cô dâu **Nhật An** và chú rể **Duy Mạnh**, cho phép khách:
- Xem thiệp mời (2 lễ: **Vu Quy** và **Thành Hôn**, mỗi lễ một phiên bản nội dung).
- Xác nhận tham dự (RSVP) với 3 lựa chọn, tự nhập tên + thêm người đi cùng.
- Đăng ký xe HCM–Cần Thơ (kèm SĐT).
- Gửi lời chúc (công khai hoặc ẩn) + xem tường lời chúc công khai.
- Xem Q&A (accordion) về mừng cưới, lịch trình xe, chỗ chơi…
- Đổi lựa chọn bất cứ lúc nào (ghi thêm, lấy lựa chọn cuối cùng).

Đồng thời đặt nền để **tái sử dụng / bán sau** (Tier A: config-driven — tách nội dung & theme khỏi code).

## 2. Kiến trúc & công nghệ

- **Frontend:** Angular, SPA, **config-driven**, mobile-first, responsive nhiều kích cỡ, song ngữ VI/EN.
- **Hosting:** **Vercel** (chốt) — kéo code từ GitHub, auto-deploy, routing SPA mượt. Code vẫn trên GitHub cho portfolio.
- **Backend/Data:** **Supabase** (PostgreSQL + REST/Realtime API + RLS) + **1 Edge Function** ghi lượt xem/IP.
- **Không dựng server riêng.** Angular gọi thẳng Supabase (RLS bảo vệ ghi); phần cần IP thật đi qua Edge Function.
- **SSL:** Vercel tự cấp miễn phí, tự gia hạn.
- **Chi phí:** 0đ ở quy mô đám cưới (chỉ tốn nếu mua tên miền riêng — tùy chọn).

Sơ đồ:
```
[Khách quét QR /vi/vu-quy hoặc /vi/thanh-hon]
        │
        ▼
   Angular app (Vercel)  ◄── code từ repo GitHub (auto-deploy)
        │  đọc/ghi (RLS)        │ ghi IP + đếm view
        ▼                       ▼
   Supabase PostgreSQL     Supabase Edge Function
```

## 3. Cấu trúc link

```
tên-web.com/{lang}/{ceremony}
   {lang}     = vi | en        (nút 🌐 đổi bất cứ lúc nào)
   {ceremony} = vu-quy | thanh-hon

Ví dụ:  /vi/vu-quy   /vi/thanh-hon   /en/vu-quy   /en/thanh-hon
```
- **2 QR thiệp** = 2 link lễ (mặc định `vi`), in trên 2 loại thiệp giấy.
- Không có link riêng từng khách, không token, không slug cá nhân.
- **Nhóm** không nằm trong link — khách chọn qua dropdown (bắt buộc) khi RSVP.

## 4. Cấu trúc trang

**Trang 1 — Bìa "nhấn để mở thiệp"**
- Tên cô dâu chú rể, họa tiết theo lễ, nút **"Mở thiệp"**.
- Cú bấm "Mở thiệp" = tương tác đầu tiên → **bật nhạc nền** hợp lệ (lách autoplay).

**Trang 2 — Nội dung (auto-scroll), thứ tự từ trên xuống:**
1. Hình cưới, thông tin nhà trai / nhà gái.
2. Thông tin mời tiệc + **agenda** của lễ tương ứng.
3. Google Map (embed) + nút Chỉ đường + **Thêm vào lịch** (Google + `.ics`).
4. **Nút Xác nhận tham dự** → mở form RSVP (mục 5).
5. **Mục Lời chúc:** ô nhập lời chúc + chọn **công khai / ẩn**; bên dưới là **tường hiển thị các lời chúc công khai**.
6. **Q&A (accordion, dưới cùng):** danh sách câu hỏi bấm mở rộng (mục 6).

> **2 loại QR khác nhau:** (a) *QR thiệp* mở website, in trên thiệp giấy; (b) *QR mừng cưới* để chuyển khoản, hiện trong câu trả lời Q&A "Gửi tiền mừng online".

## 5. Form RSVP

Hiển thị khi bấm "Xác nhận tham dự":

- **Tên của bạn** — ô nhập, có **gợi ý (autocomplete)** từ danh sách `guests`.
- **Nhóm** — **dropdown BẮT BUỘC, có ô search** (gõ để lọc). Danh sách nhóm nằm trong config (VD: Bạn nhà trai / Họ hàng nhà gái / IAS…).
- **Thêm người đi cùng** — nhập tên từng người; mỗi người có checkbox **"đi xe"** để đếm ghế.
- **3 lựa chọn** (status):
  1. **Đồng ý & tự túc xe** (`self_transport`)
  2. **Đồng ý & đăng ký xe HCM–Cần Thơ** (`bus`) — cạnh có **icon (i)**; bấm vào **mở rộng** khối chữ nhạt hơn: điểm lên xe, giờ xuất phát, thời gian di chuyển dự kiến, + **ô nhập SĐT**.
  3. **Không thể tham dự** (`cannot_attend`)
- **Ghi chú hiển thị cho khách** (ngay lúc chọn): *"Bạn có thể quay lại nhập tên và chọn lại bất cứ lúc nào — hệ thống lấy lựa chọn cuối cùng."*

### Xử lý trùng tên
**Điều kiện kích hoạt:** khi khách gửi xác nhận, nếu đã tồn tại một khách **trùng tên (`name_norm`)** + **trùng nhóm (`category`)** + **trùng lựa chọn (`status`)** nhưng **khác IP** → hiện popup:

> **Có khách trùng tên trong nhóm này**
> Đã có một người cùng tên trong nhóm **"{Nhóm}"** xác nhận **"{lựa chọn}"** trước đó.
> - Nếu đây chính là bạn và bạn muốn cập nhật lựa chọn — bấm **Tiếp tục**.
> - Nếu là người khác, vui lòng thêm chi tiết vào tên để phân biệt (ví dụ: *"Minh (IAS)"*, *"Minh — bạn cấp 3"*) rồi gửi lại.
>
> `[ Sửa tên ]  [ Tiếp tục ]`

- **Cùng IP** → không hiện popup (là chính khách đó đổi ý → lấy lựa chọn cuối cùng).
- Không thỏa các điều kiện trên → ghi bình thường.

## 6. Q&A (accordion, config-driven)

Danh sách câu hỏi dạng mở rộng; nội dung câu trả lời nằm trong config (i18n). Bộ câu hỏi ban đầu:

| Câu hỏi | Câu trả lời |
|---|---|
| Gửi tiền mừng online được không? | **Hiện 2 QR mừng cưới** (cô dâu + chú rể) + tên/STK/ngân hàng + nút copy. |
| Lịch trình xe đưa đón thế nào? | Số tài xế, địa chỉ, giờ xuất phát dự kiến, khách sạn để ở. *(điền sau)* |
| Nếu chỉ đi HCM → Cần Thơ, không quay về? | *(cập nhật sau — gợi ý nhà xe / vé xe chiều về)* |
| Nếu chỉ ké chiều về HCM, không xuất phát từ HCM? | *(cập nhật sau)* |
| Cần Thơ có gì chơi? | *(điền sau)* |
| Đắk Lắk có gì chơi? | *(điền sau)* |

> Câu trả lời "điền sau" để **placeholder** trong config, cập nhật dần không cần đụng code.

## 7. Mô hình dữ liệu (Supabase / PostgreSQL)

Nội dung 2 lễ + Q&A + danh sách nhóm + theme nằm trong **file config**, không phải DB.

### Bảng `rsvp` (APPEND-ONLY — mỗi lần xác nhận là 1 dòng mới, KHÔNG đè)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | pk | |
| ceremony | text | `vu-quy` \| `thanh-hon` (theo URL khách vào) |
| guest_name | text | tên khách gõ |
| name_norm | text | tên chuẩn hóa (bỏ dấu, thường) — để gom/đối chiếu |
| category | text | từ dropdown nhóm — **bắt buộc** |
| status | text | `self_transport` \| `bus` \| `cannot_attend` |
| phone | text null | chỉ khi chọn `bus` |
| party_size | int | tổng số người (gồm người đi cùng) |
| matched_guest_id | fk null | trỏ `guests.id` nếu khớp autocomplete |
| ip | text | IP người xác nhận |
| user_agent | text null | |
| created_at | timestamptz | |

> Không đè. **Trạng thái hiện tại = dòng mới nhất theo (name_norm, ceremony)** qua view `rsvp_latest`.
> IP-theo-tên = lọc `ip` theo `name_norm`; số lần đổi ý = đếm dòng theo `name_norm`.

### Bảng `companions` (người đi cùng — gắn theo từng dòng rsvp)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | pk | |
| rsvp_id | fk | trỏ `rsvp.id` |
| name | text | |
| joins_bus | bool | có đi xe không (đếm ghế) |
| relation | text null | Vợ / Con / … |

### Bảng `wishes` (lời chúc — mục cuối trang)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | pk | |
| ceremony | text | |
| name | text | tên người chúc |
| message | text | nội dung |
| is_public | bool | true = hiện trên tường công khai |
| ip | text | |
| created_at | timestamptz | |

> Tường lời chúc hiển thị `where is_public = true`. (Có thể thêm kiểm duyệt nhẹ sau nếu bị spam.)

### Bảng `guests` (import từ Excel — CHỈ để gợi ý tên + đối chiếu)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | pk | |
| full_name | text | |
| category | text null | nhóm |
| expected_size | int null | số người dự kiến |
| notes | text null | ghi chú nội bộ |

### Bảng `page_visits` (đếm lượt MỞ trang, kể cả chỉ xem)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | pk | |
| ceremony | text | |
| ip | text | |
| visited_at | timestamptz | |

## 8. Import Excel (một lần)

Excel là **đầu vào một lần** để seed `guests` (bật autocomplete + báo cáo đối chiếu). Sau import, nguồn sự thật là DB.

**Cột Excel:** STT · Họ và tên* · Nhóm/Category · Số người dự kiến · Số điện thoại (tùy chọn) · Ghi chú.
*(Đã bỏ: Giới tính, Ngôn ngữ, Slug, Cách xưng hô, Mời dự lễ.)*

Vợ chồng / gia đình mời chung = **1 dòng** (tên đại diện); tên người còn lại để khách tự khai khi RSVP hoặc ghi ở Ghi chú.

## 9. Trang quản trị / xuất báo cáo

- Danh sách xác nhận theo từng lễ (từ `rsvp_latest`).
- Tổng số người + **tổng ghế xe** (khách `bus` + companions `joins_bus = true`).
- Lời chúc (công khai/ẩn).
- Đối chiếu "đã mời (guests) vs đã xác nhận".
- **Xuất Excel** để đưa nhà hàng / nhà xe.
- Xem qua Supabase Dashboard sẵn có và/hoặc trang admin trong app.

## 10. Song ngữ, nhạc, map, lịch

- **VI/EN:** mặc định VI; link `/en/...` cho khách nước ngoài; nút 🌐 đổi runtime; (tùy chọn) tự nhận diện ngôn ngữ trình duyệt.
- **Nhạc:** file trong assets/Supabase Storage; bật sau cú bấm "Mở thiệp".
- **Map:** embed Google Maps (không cần API key) + nút Chỉ đường.
- **Lịch:** nút Thêm vào Google Calendar + file `.ics` (Apple).

## 11. Bảo mật (mức phù hợp web cưới)

- Ghi RSVP/wishes qua Supabase với **RLS** cho phép INSERT có kiểm soát; giới hạn nhẹ theo IP qua Edge Function (chống spam cơ bản).
- Không lưu dữ liệu nhạy cảm ngoài SĐT (chỉ khi khách tự nhập để đi xe).
- QR mừng cưới là ảnh tĩnh do cô dâu chú rể cung cấp — không tích hợp cổng thanh toán.

## 12. Config-driven (Tier A) — nền cho bán sau

Toàn bộ nội dung + theme đọc từ config; mỗi đám cưới = 1 bộ config.
```jsonc
{
  "couple": { "groom": "Duy Mạnh", "bride": "Nhật An" },
  "ceremonies": {
    "vu-quy":    { "venue": "...", "address": "...", "mapUrl": "...", "datetime": "...", "agenda": [...] },
    "thanh-hon": { "venue": "...", "address": "...", "mapUrl": "...", "datetime": "...", "agenda": [...] }
  },
  "rsvp":  { "groups": ["Bạn nhà trai", "Họ hàng nhà gái", "IAS"],
             "bus": { "pickup": "...", "departTime": "...", "duration": "..." } },
  "gift":  { "bride": { "name": "...", "bank": "...", "account": "...", "qr": "..." },
             "groom": { "name": "...", "bank": "...", "account": "...", "qr": "..." } },
  "faq":   [ { "q": "...", "a": "..." } ],
  "theme": { "primary": "#9E1B1B", "font": "...", "music": "..." },
  "i18n":  { "vi": { ... }, "en": { ... } }
}
```
Giai đoạn đầu: điền **data giả** vào config, thay dần bằng data thật.

## 13. Ngoài phạm vi (để sau)

- Tier B (nhiều theme để khách chọn) / Tier C (SaaS: đăng ký, admin, thanh toán, multi-tenant).
- Tích hợp cổng thanh toán cho mừng cưới.
- Đăng nhập tài khoản. Kiểm duyệt lời chúc nâng cao.

## 14. Quyết định đã chốt & điểm còn mở

**Đã chốt:**
- **Nơi đặt dự án:** `C:\Users\Intelisys_Admin\Desktop\manhan` (khởi tạo git).
- **Host:** Vercel.
- **Trùng tên:** xử lý bằng popup (mục 5 — "Xử lý trùng tên").
- **QR mừng cưới:** dời hẳn vào Q&A (câu "Gửi tiền mừng online") — không còn nút riêng.

**Còn mở:**
- **Thông tin thật:** tên đầy đủ, ngày giờ, địa điểm 2 lễ, agenda, STK/QR, nhạc, nội dung Q&A "điền sau" → **cập nhật sau** (giai đoạn đầu dùng data giả).
