# Ảnh của thiệp — bỏ file vào đây

Tên file phải **khớp đúng** với `src/assets/config/wedding.config.ts`
(muốn đổi tên → sửa config, hoặc báo mình sửa giúp).

| File | Dùng cho | Gợi ý |
|------|----------|-------|
| `cover.webp` | Ảnh bìa hero (đầu trang) | Dọc, tỷ lệ ~3:4, ví dụ 1200×1600px |
| `album-01.webp` đến `album-04.webp` | Slider album cuối trang | Nén khoảng 150–400KB/ảnh |
| `qr-bride.png` | QR chuyển khoản **cô dâu** (hiện trong Q&A) | Vuông, QR VietQR từ app ngân hàng |
| `qr-groom.png` | QR chuyển khoản **chú rể** (hiện trong Q&A) | Vuông, QR VietQR từ app ngân hàng |

Sau khi bỏ ảnh vào, cập nhật `media.coverImg` và danh sách `media.photos`
trong `src/assets/config/wedding.config.ts`. QR chỉ hiện khi bật lại phần Q&A.

Nhớ **nén ảnh**, xóa metadata EXIF/GPS trước khi commit và quét thử QR chuyển
khoản để kiểm tra đúng người nhận.
