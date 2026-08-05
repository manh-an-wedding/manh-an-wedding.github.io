# Thiết kế tên bìa và địa điểm nghi lễ

## Phần bìa

Khối thông tin tiếp tục nằm ở góc dưới bên phải ảnh bìa, không có nền màu hoặc khung.

Nội dung được hiển thị thành năm dòng:

1. `Duy Mạnh`
2. `&`
3. `Nhật An`
4. `11:00 · 17/10/2026`
5. `Vạn Phát Riverside, Cần Thơ`

Tên chú rể và cô dâu dùng chữ lớn màu trắng. Dấu `&` dùng màu vàng và nằm trên dòng riêng. Giờ/ngày và địa điểm tiếp tục dùng cỡ chữ nhỏ hơn.

## Phần báo tin

Trong khối thông tin nghi lễ, hiển thị:

1. `HÔN LỄ ĐƯỢC CỬ HÀNH TẠI` — chữ nhỏ;
2. `Tư gia nhà gái` — chữ lớn màu đỏ;
3. hàng giờ và ngày;
4. ngày âm lịch.

Bỏ hoàn toàn:

- tiêu đề `Lễ Vu Quy`;
- khối cuối gồm `Tại`, `Tư gia nhà gái` và `Bình Thủy, Cần Thơ`.

Thông tin Nhà gái ở phần hai gia đình vẫn giữ nguyên; yêu cầu bỏ địa chỉ chỉ áp dụng cho cuối khối nghi lễ.

## Chữ Hỷ, đường phân cách và tên sảnh

- Bỏ chữ Hỷ phía trên hai cột Nhà trai và Nhà gái.
- Chỉ các đường dùng để phân cách những phần nội dung mới có họa tiết nhỏ ở giữa.
- Giữ đường phân cách có họa tiết giữa các khối đã có.
- Thêm đường phân cách cùng kiểu trước phần xác nhận tham dự và trước album.
- Bỏ các đường ngang trống cũ ở ranh giới RSVP và album để không xuất hiện hai đường chồng nhau.
- Trong tên `VẠN PHÁT RIVERSIDE - SẢNH 01`, chữ số `01` dùng kiểu số thẳng hàng và cùng chiều cao thị giác với chữ hoa `SẢNH`.

## RSVP và người đi cùng

- Khi chuyển từ lựa chọn xe sang một lựa chọn khác, bảng thông tin xe tự động đóng.
- Bỏ checkbox `Đi xe` khỏi từng người đi cùng.
- Khi trạng thái của khách chính là đi xe, toàn bộ người đi cùng được lưu là đi xe; khi trạng thái khác, toàn bộ người đi cùng được lưu là không đi xe.
- Sau nút thông tin `i`, hiển thị tổng số người đi xe gồm khách chính và các người đi cùng đã nhập tên:
  - không có người đi cùng: `(1 người)`;
  - có hai người đi cùng: `(3 người)`.
- Con số tổng đặt trong ngoặc, dùng chữ nghiêng và màu xanh lá.
- Khi thêm người đi cùng:
  - ô tên có viền cùng màu nút gửi xác nhận;
  - chữ nhập trong ô được in đậm;
  - nút `✕` không có nền, dùng cùng màu nút gửi xác nhận và in đậm.

## Vi chỉnh hiển thị

- Thêm đúng bốn khoảng trắng không ngắt dòng sau dấu `&` trên bìa, làm dấu `&` lệch sang trái trong khối căn phải.
- Giảm khoảng cách từ câu `Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.` đến nút `Chỉ đường` xuống khoảng `0,85rem`.
- Chỉ hiển thị tổng `(n người)` sau nút `i` khi lựa chọn xe đang được chọn.
- Bỏ hoàn toàn placeholder trong ô tên người đi cùng.

## Phạm vi kỹ thuật

- Cập nhật template và CSS hiện tại, không tạo component mới.
- Giữ nguyên dữ liệu ngày giờ, mời tiệc, cơ chế gửi RSVP, album, Wishes và FAQ; chỉ thay đổi cách xác định `joinsBus` của người đi cùng như mô tả.
- Không thêm hoặc chạy test theo yêu cầu trước đó; chỉ chạy build kiểm tra biên dịch.
- Không tạo commit hoặc push.
