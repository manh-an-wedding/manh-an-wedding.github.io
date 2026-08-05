# Thiết kế cập nhật Lễ Vu Quy và khối mời tiệc

## Phạm vi

Cập nhật dữ liệu gia đình, giờ Lễ Vu Quy, bố cục phần mời tiệc, thời lượng sự kiện lịch, thông tin xe và nội dung RSVP. Giữ nguyên ảnh bìa, các ảnh cuối trang, bảng màu đỏ rượu–kem–vàng, cũng như trạng thái ẩn của Wishes và FAQ.

## Dữ liệu

- Bố cô dâu: `Lê Văn Năm`.
- Lễ Vu Quy: `08:00`, ngày `17/10/2026`.
- Địa điểm Lễ Vu Quy:
  - tên: `Tư gia nhà gái`;
  - địa chỉ hiển thị: `Bình Thủy, Cần Thơ`.
- Tiệc cưới:
  - đón khách: `10:15`;
  - khai tiệc: `11:00`;
  - kết thúc sự kiện lịch: `13:30`;
  - địa điểm: `VẠN PHÁT RIVERSIDE – SẢNH 01`;
  - địa chỉ: `Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ`;
  - liên kết chỉ đường hiện tại được giữ nguyên.
- Ảnh bìa hiển thị địa điểm ngắn: `Vạn Phát Riverside, Cần Thơ`.

## Bố cục thông tin gia đình

- Các tiền tố `Ông` và `Bà` nằm cùng hàng với tên tương ứng.
- Hai cột Nhà trai và Nhà gái vẫn được giữ.
- Trong phần tên đôi uyên ương, giữ thứ tự `Duy Mạnh` trước `Nhật An`.
- Bỏ hai nhãn vai trò `Chú rể` và `Cô dâu`.

## Bố cục Lễ Vu Quy

- Lời báo tin dùng đúng câu `Trân trọng báo tin Lễ Vu Quy của con chúng tôi`.
- Giữ tiêu đề `Lễ Vu Quy`.
- Hiển thị giờ `08:00` và ngày `17.10.2026` nổi bật.
- Ngày âm lịch tiếp tục hiển thị nhỏ bên dưới.
- Hiển thị `Tư gia nhà gái`, sau đó là `Bình Thủy, Cần Thơ`.

## Bố cục mời tiệc

Khối mời tiệc là một bố cục liền mạch, căn giữa theo thứ tự:

1. `Trân trọng kính mời bạn đến dự buổi tiệc chung vui cùng gia đình chúng tôi tại`.
2. Nhãn nhỏ `Nhà Hàng, Khách sạn`.
3. Tên địa điểm lớn `VẠN PHÁT RIVERSIDE – SẢNH 01`.
4. Địa chỉ nhà hàng ở cỡ chữ nhỏ.
5. Hai mốc giờ nổi bật:
   - `Đón khách 10:15`;
   - `Khai tiệc 11:00`.
6. Ngày `17.10.2026` ở cỡ chữ lớn.
7. Ngày âm lịch ở cỡ chữ nhỏ.
8. Câu `Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.`
9. Ba nút hành động:
   - `Chỉ đường`;
   - `Thêm vào Google Calendar`;
   - `Thêm vào lịch (Apple)`.

Không hiển thị iframe Google Maps.

## Bố cục liền mạch

- Ảnh bìa nối trực tiếp với phần nội dung, không có khoảng trống.
- Toàn bộ phần Lễ Vu Quy, mời tiệc, nút hành động, RSVP và ảnh cuối trang nằm trên một dải nền kem thống nhất.
- Không dùng các thẻ rời, khoảng cách nền, góc bo hoặc bóng đổ để tách từng phần.
- Các phần có thể được phân tách bằng đường vàng mảnh hoặc khoảng đệm nội bộ nhưng vẫn phải tạo cảm giác là một tấm thiệp liên tục.
- Bỏ tiêu đề `Album ảnh`; giữ nguyên các ảnh cuối trang.

## Lịch

- Thời gian bắt đầu lấy từ `reception.datetime`: `11:00`.
- Thời gian kết thúc được tính sau `2,5 giờ`: `13:30`.
- Google Calendar và tệp ICS dùng cùng mốc `11:00–13:30`.
- Địa điểm lịch tiếp tục dùng địa chỉ đầy đủ của Vạn Phát Riverside.

## RSVP và xe đưa đón

- Nhãn tên đổi từ `Tên của bạn` thành `Vui lòng nhập tên của bạn`.
- Nhãn nhóm đổi từ `Bạn thuộc nhóm` thành `Và nhóm`.
- Nút thông tin xe dùng chữ `i` trong vòng tròn màu hồng giống màu nút `Gửi xác nhận`; không có viền hoặc nền hình vuông.
- Nội dung thông tin xe hiển thị đúng các dòng:
  - `Xe bắt đầu xuất phát`
  - `7:30 17.10.2026 tại Ibis hotel, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh.`
  - `Dự kiến đến nhà hàng: 10:30.`
  - `Dự kiến xuất phát từ nhà hàng về lại HCM: 13:30.`
  - `Dự kiến về đến Ibis hotel: 17:30.`
- Khi khách chọn lựa chọn xe, ô số điện thoại tự động xuất hiện với nhãn `Vui lòng nhập SĐT`.
- Nội dung thông tin xe vẫn có thể mở/đóng bằng nút `i`; việc hiển thị ô số điện thoại không phụ thuộc vào trạng thái mở của phần thông tin.

## Kiểm thử

- Test cấu hình xác nhận tên `Lê Văn Năm`, giờ Lễ Vu Quy `08:00`, địa chỉ `Bình Thủy, Cần Thơ`, địa điểm bìa và thời lượng lịch `2,5 giờ`.
- Test giao diện xác nhận Ông/Bà cùng hàng với tên, không còn nhãn Chú rể/Cô dâu, đúng thứ tự nội dung và không có iframe bản đồ.
- Test Calendar xác nhận Google Calendar và ICS cùng bắt đầu `11:00`, kết thúc `13:30`.
- Test RSVP xác nhận chọn xe tự hiện trường số điện thoại, thông tin xe xuống dòng đúng và nhãn form đã đổi.
- Kiểm tra CSS xác nhận các phần nội dung nối liền trên cùng nền kem, không còn khung thẻ tách rời.
- Chạy toàn bộ test, build production và kiểm tra trực quan trên mobile/desktop.
