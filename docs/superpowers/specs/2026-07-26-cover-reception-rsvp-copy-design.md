# Thiết kế cập nhật bìa, thư mời và RSVP

## Phạm vi

Cập nhật trực tiếp các component hiện tại. Không tách component mới, không thay đổi cơ chế lưu RSVP, không thay đổi lịch tiệc và không thay đổi ảnh bìa.

Theo yêu cầu của người dùng, thay đổi này không bổ sung hoặc chạy test. Sau khi triển khai chỉ kiểm tra biên dịch để phát hiện lỗi cú pháp hoặc type.

## Phần bìa

- Giữ ảnh bìa và lớp tối nhẹ hiện có ở đáy ảnh để bảo đảm độ tương phản.
- Bỏ nền đỏ phía sau khối thông tin.
- Bỏ chữ `Thư mời` trên ảnh bìa.
- Di chuyển tên và thông tin sự kiện thành một khối căn phải ở góc dưới bên phải:
  1. `Duy Mạnh & Nhật An`;
  2. `11:00 · 17/10/2026`;
  3. `Vạn Phát Riverside, Cần Thơ`.
- Chữ dùng màu trắng và vàng, có bóng chữ nhẹ; không dùng khung hoặc nền màu.

## Phần mời tiệc

- Tiêu đề hiển thị là `THƯ MỜI`.
- Câu mời hiển thị đúng: `Trân trọng kính mời quý khách đến chung vui cùng gia đình chúng tôi tại`.
- Các thông tin địa điểm, giờ đón khách, giờ khai tiệc, ngày và ngày âm lịch giữ nguyên.
- Ba nút chỉ đường và lịch vẫn nằm trong phần mời tiệc.
- Bỏ đường vàng nằm ngay trước nhóm ba nút.

## Phần xác nhận tham dự

- Thêm tiêu đề `XÁC NHẬN THAM DỰ` ở đầu form.
- Thứ tự lựa chọn:
  1. `Tham dự & zô xe đưa đón khứ hồi HCM–CT`;
  2. `Tham dự & tự di chuyển`;
  3. `Không thể tham dự`.
- Lựa chọn xe vẫn hiển thị nút thông tin `i`.
- Khi chọn xe, trường số điện thoại tiếp tục tự động xuất hiện.

## Thông tin xe

Nội dung thông tin xe được chia thành hai chặng.

### Hồ Chí Minh đi Cần Thơ

- Tiêu đề: `Xe khởi hành Hồ Chí Minh đi Cần Thơ:`
- `Xuất phát: 07:30 - 17.10.2026`
- `Địa điểm: IBIS SAIGON AIRPORT, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh.`
- `Dự kiến đến nhà hàng: 10:30`

Địa điểm IBIS có biểu tượng vị trí và toàn bộ tên địa điểm là liên kết:

`https://maps.app.goo.gl/A4G9MXVdHavg2cTq6`

Liên kết mở trong tab mới và dùng `rel="noopener"`.

### Cần Thơ về Hồ Chí Minh

- Tiêu đề: `Xe khởi hành Cần Thơ về Hồ Chí Minh:`
- `Xuất phát: 13:30 (dự kiến)`
- `Địa điểm: Sảnh 01 Vạn Phát`
- `Dự kiến về đến IBIS: 17:30`

## Tiếng Anh

- Giữ bản tiếng Anh hoạt động bằng cách cập nhật các khóa tương ứng.
- Nội dung không để lộ khóa dịch thô trên giao diện.

## Ngoài phạm vi

- Không thay đổi backend hoặc payload RSVP.
- Không thay đổi ngày giờ tiệc và liên kết lịch.
- Không thay đổi Wishes, FAQ hoặc album.
- Không tạo commit hoặc push.
