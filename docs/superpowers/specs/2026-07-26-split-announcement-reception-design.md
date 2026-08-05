# Thiết kế tách phần báo tin và mời tiệc

## Mục tiêu

Tách rõ nội dung báo tin Lễ Vu Quy và nội dung mời tiệc thành hai phần độc lập về ngữ nghĩa và thị giác. Hai phần vẫn nằm trên cùng một dải nền kem liền mạch, không tạo hai thẻ nổi hoặc khoảng nền rời nhau.

## Phần báo tin Lễ Vu Quy

Phần thứ nhất giữ nguyên các nội dung:

1. Thông tin Nhà trai và Nhà gái.
2. Lời `Trân trọng báo tin Lễ Vu Quy của con chúng tôi`.
3. Tên `Duy Mạnh & Nhật An`.
4. Tiêu đề `Lễ Vu Quy`.
5. Giờ làm lễ `08:00`.
6. Ngày làm lễ `17.10.2026`.
7. Ngày âm lịch.
8. Địa điểm `Tư gia nhà gái`.
9. Địa chỉ `Bình Thủy, Cần Thơ`.

Phần này không chứa lời mời dự tiệc, thông tin nhà hàng hoặc các nút hành động.

## Đường phân cách

Giữa hai phần có một đường vàng mảnh:

- chạy hết chiều ngang dải nội dung và chạm hai mép của dải thiệp;
- không bị giới hạn bởi khoảng đệm ngang của nội dung bên trong;
- có một họa tiết vàng nhỏ nằm chính giữa;
- họa tiết có nền cùng màu kem của trang để che nhẹ đoạn đường kẻ phía sau;
- không tạo bóng đổ, góc bo hoặc khoảng nền tách rời.

## Phần thư mời tiệc

Phần thứ hai bắt đầu sau đường phân cách và chứa trọn vẹn:

1. Tiêu đề hiển thị `THƯ MỜI TIỆC`.
2. Câu `Trân trọng kính mời bạn đến dự buổi tiệc chung vui cùng gia đình chúng tôi tại`.
3. Nhãn nhỏ `Nhà Hàng, Khách sạn`.
4. Tên lớn `VẠN PHÁT RIVERSIDE - SẢNH 01`.
5. Địa chỉ nhỏ `Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ`.
6. Giờ đón khách `10:15`.
7. Giờ khai tiệc `11:00`.
8. Ngày đãi tiệc `17.10.2026`.
9. Ngày âm lịch.
10. Câu `Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.`
11. Ba nút `Chỉ đường`, `Thêm vào Google Calendar` và `Thêm vào lịch (Apple)`.

Ba nút là nội dung trực tiếp của phần thư mời tiệc và nằm sau câu về sự hiện diện của quý khách, trước phần xác nhận tham dự.

## Trình bày ngày và giờ đãi tiệc

- `10:15`, `11:00` và `17.10.2026` dùng cùng font tiêu đề, màu đỏ và độ đậm.
- Ngày `17.10.2026` có cỡ chữ lớn tương đương các giá trị giờ, không dùng kiểu chữ nhỏ màu xám như hiện tại.
- Hai mốc giờ tiếp tục nằm trong hàng hai cột.
- Ngày đãi tiệc nằm ở hàng riêng ngay bên dưới, có nhãn nhỏ `Ngày`, được căn giữa.
- Ngày âm lịch vẫn là dòng chữ nhỏ ngay bên dưới ngày dương lịch.

## Cấu trúc giao diện

- Dùng hai `section` cấp cao riêng trong phần nội dung:
  - phần báo tin;
  - phần thư mời tiệc.
- Component chứa ba nút lịch và chỉ đường được đặt bên trong `section` thư mời tiệc.
- RSVP bắt đầu sau khi `section` thư mời tiệc kết thúc.
- Album ảnh, RSVP, Wishes và FAQ không thay đổi ngoài việc dịch chuyển tự nhiên theo bố cục mới.
- Wishes và FAQ tiếp tục ẩn.

## Khả năng đáp ứng

- Trên mobile, đường phân cách vẫn chạm hai mép của dải thiệp.
- Hàng hai cột của giờ đón khách và giờ khai tiệc được giữ nguyên.
- Ngày đãi tiệc nằm ở hàng riêng để không làm ba cột bị chật.
- Không được xuất hiện thanh cuộn ngang.

## Kiểm thử

- Test xác nhận tồn tại hai phần cấp cao riêng biệt và đúng thứ tự: báo tin trước, mời tiệc sau.
- Test xác nhận phần báo tin không chứa component ba nút.
- Test xác nhận phần mời tiệc chứa đúng ba nút hành động.
- Test xác nhận phần xác nhận tham dự nằm sau phần mời tiệc.
- Test xác nhận ngày đãi tiệc có nhãn `Ngày`, giá trị `17.10.2026` và class trình bày lớn riêng.
- QA trực quan xác nhận đường phân cách chạy hết chiều ngang, có họa tiết ở giữa và ngày đãi tiệc dùng cùng kiểu giá trị với giờ.
- Chạy toàn bộ test, build production và kiểm tra trực quan trên mobile/desktop.

## Không thuộc phạm vi

- Không thay đổi dữ liệu ngày giờ, địa chỉ, lịch, RSVP hoặc thông tin xe.
- Không thêm iframe Google Maps.
- Không thay đổi ảnh bìa hoặc danh sách ảnh.
- Không tách trang thành hai nền hoặc hai thẻ có khoảng cách.
