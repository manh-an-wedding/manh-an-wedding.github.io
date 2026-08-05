# Continuous Invitation, RSVP, and Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cập nhật nội dung thiệp, lịch, xe đưa đón và RSVP, đồng thời nối toàn bộ trang thành một dải nền kem liên tục.

**Architecture:** Dữ liệu xác nhận tiếp tục nằm trong `WEDDING`; template chỉ trình bày dữ liệu và bản dịch. `MapCalendarComponent` chỉ chịu trách nhiệm tạo ba liên kết hành động và nội dung lịch, còn `RsvpFormComponent` quản lý trạng thái lựa chọn xe, phần thông tin và trường số điện thoại.

**Tech Stack:** Angular 22 standalone components, Angular template control flow, ngx-translate, Vitest, SCSS.

## Global Constraints

- Giao diện mặc định dùng tiếng Việt.
- Giữ thứ tự `Duy Mạnh` trước `Nhật An`.
- Giữ `Đón khách 10:15`, `Khai tiệc 11:00`; Calendar kết thúc `13:30`.
- Giữ RSVP, các ảnh cuối trang và trạng thái ẩn của Wishes/FAQ.
- Không hiển thị iframe Google Maps.
- Tất cả phần nội dung sau ảnh bìa dùng chung một nền kem, không có thẻ rời hoặc khoảng hở.
- Không commit hoặc push; giữ thay đổi trong workspace theo lựa chọn trước của người dùng.

---

### Task 1: Cập nhật dữ liệu xác nhận và cấu trúc xe

**Files:**
- Modify: `src/app/core/wedding-config.ts`
- Modify: `src/assets/config/wedding.config.ts`
- Test: `src/app/core/wedding-config.spec.ts`

**Interfaces:**
- Produces: `WeddingConfig.rsvp.bus` với các trường `pickup`, `departTime`, `restaurantArrivalTime`, `returnDepartTime`, `hotelArrivalTime`.
- Produces: `WeddingConfig.reception.calendarDurationHours = 2.5`.

- [ ] **Step 1: Viết test cấu hình thất bại**

Thêm các xác nhận:

```ts
expect(WEDDING.families.bride.father).toBe('Lê Văn Năm');
expect(WEDDING.ceremony.datetime).toBe('2026-10-17T08:00:00+07:00');
expect(WEDDING.ceremony.address).toBe('Bình Thủy, Cần Thơ');
expect(WEDDING.reception.shortVenue).toBe('Vạn Phát Riverside, Cần Thơ');
expect(WEDDING.reception.calendarDurationHours).toBe(2.5);
expect(WEDDING.rsvp.bus).toEqual({
  pickup: 'Ibis hotel, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh',
  departTime: '7:30 17.10.2026',
  restaurantArrivalTime: '10:30',
  returnDepartTime: '13:30',
  hotelArrivalTime: '17:30',
});
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `npm test -- --watch=false`

Expected: FAIL tại các giá trị bố cô dâu, giờ Vu Quy, địa chỉ, thời lượng lịch và dữ liệu xe cũ.

- [ ] **Step 3: Mở rộng kiểu dữ liệu và cập nhật config**

Đổi cấu trúc `rsvp.bus` thành:

```ts
bus: {
  pickup: string;
  departTime: string;
  restaurantArrivalTime: string;
  returnDepartTime: string;
  hotelArrivalTime: string;
};
```

Cập nhật `WEDDING` theo đúng giá trị trong Step 1; đặt:

```ts
venue: 'VẠN PHÁT RIVERSIDE - SẢNH 01',
shortVenue: 'Vạn Phát Riverside, Cần Thơ',
calendarDurationHours: 2.5,
```

Đồng bộ `event.venue` với tên địa điểm mới.

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `npm test -- --watch=false`

Expected: toàn bộ test PASS.

---

### Task 2: Sắp lại nội dung thiệp và bỏ vai trò Chú rể/Cô dâu

**Files:**
- Modify: `src/app/pages/invite/invite.component.html`
- Modify: `public/assets/i18n/vi.json`
- Modify: `public/assets/i18n/en.json`
- Test: `src/app/pages/invite/invite.component.spec.ts`

**Interfaces:**
- Consumes: dữ liệu Task 1.
- Produces: `.family-line`, `.reception-invitation`, `.reception-venue-label`, `.reception-venue-name`, `.reception-date`.

- [ ] **Step 1: Viết test giao diện thất bại**

Thêm hoặc cập nhật test để xác nhận:

```ts
expect(sectionText('.cover-hero')).toContain('Vạn Phát Riverside, Cần Thơ');
expect(sectionText('.families')).toContain('Ông Lê Văn Năm');
expect(element.querySelectorAll('.family-line')).toHaveLength(4);
expect(sectionText('.invitation-intro')).not.toContain('Chú rể');
expect(sectionText('.invitation-intro')).not.toContain('Cô dâu');
expect(sectionText('.invitation-intro'))
  .toContain('Trân trọng báo tin Lễ Vu Quy của con chúng tôi');
expect(sectionText('.ceremony-card')).toContain('08:00');
expect(sectionText('.ceremony-card')).toContain('Bình Thủy, Cần Thơ');
expect(sectionText('.reception-card')).toContain(
  'Trân trọng kính mời bạn đến dự buổi tiệc chung vui cùng gia đình chúng tôi tại',
);
expect(sectionText('.reception-venue-name'))
  .toContain('VẠN PHÁT RIVERSIDE - SẢNH 01');
expect(sectionText('.reception-card')).toContain('10:15');
expect(sectionText('.reception-card')).toContain('11:00');
expect(sectionText('.reception-card')).toContain(
  'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.',
);
expect(element.querySelector('.album h2')).toBeNull();
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `npm test -- --watch=false`

Expected: FAIL vì dữ liệu và cấu trúc cũ vẫn còn.

- [ ] **Step 3: Cập nhật bản dịch và template**

Đặt bản dịch tiếng Việt:

```json
{
  "details": {
    "announcement": "Trân trọng báo tin Lễ Vu Quy của con chúng tôi",
    "reception_invitation": "Trân trọng kính mời bạn đến dự buổi tiệc chung vui cùng gia đình chúng tôi tại",
    "reception_venue_label": "Nhà Hàng, Khách sạn"
  }
}
```

Đặt nội dung tiếng Anh tương ứng để `/en` không hiện khóa dịch.

Trong template:

- bọc `Ông/Bà` và tên trong cùng một `<p class="family-line">`;
- xóa hai `<small>` vai trò trong `.couple-full-names`;
- giữ dấu `&` giữa hai tên;
- xây `.reception-card` theo thứ tự lời mời, nhãn nhà hàng, tên địa điểm lớn, địa chỉ nhỏ, hai mốc giờ, ngày lớn, ngày âm lịch nhỏ, câu “Sự hiện diện…”;
- xóa `.rsvp-intro` cũ trước form;
- xóa `<h2>` “Album ảnh”, giữ các ảnh và có thể giữ dòng “Khoảnh khắc của chúng mình”.

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `npm test -- --watch=false`

Expected: toàn bộ test PASS.

---

### Task 3: Bỏ bản đồ nhúng và cập nhật Calendar 11:00–13:30

**Files:**
- Modify: `src/app/components/map-calendar/map-calendar.component.ts`
- Test: `src/app/components/map-calendar/map-calendar.component.spec.ts`

**Interfaces:**
- Consumes: `reception.datetime`, `calendarDurationHours`, `mapDirUrl`, `address`.
- Produces: `googleCalUrl(): string`, `icsText(): string`, `icsHref(): string`.

- [ ] **Step 1: Viết test Calendar và iframe thất bại**

Thêm:

```ts
const google = new URL(c.googleCalUrl());
expect(google.searchParams.get('dates'))
  .toBe('20261017T040000Z/20261017T063000Z');
expect(c.icsText()).toContain('DTSTART:20261017T040000Z');
expect(c.icsText()).toContain('DTEND:20261017T063000Z');

fixture.detectChanges();
expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(3);
```

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `npm test -- --watch=false`

Expected: FAIL vì lịch hiện kết thúc 14:00 và template còn iframe.

- [ ] **Step 3: Xóa iframe và sanitizer**

Xóa `DomSanitizer`, `SafeResourceUrl` và `safeMap`. Giữ template:

```html
<section class="map-cal" aria-label="Các tùy chọn lịch và chỉ đường">
  <a [href]="cfg.reception.mapDirUrl" target="_blank" rel="noopener">
    {{ 'map.directions' | translate }}
  </a>
  <a [href]="googleCalUrl()" target="_blank" rel="noopener">
    {{ 'map.gcal' | translate }}
  </a>
  <a [href]="icsHref()" download="wedding.ics">
    {{ 'map.ics' | translate }}
  </a>
</section>
```

Không thay đổi công thức `end = start + calendarDurationHours`; giá trị `2.5` từ Task 1 tạo đúng `13:30`.

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `npm test -- --watch=false`

Expected: toàn bộ test PASS.

---

### Task 4: Cập nhật RSVP, thông tin xe và trường số điện thoại

**Files:**
- Modify: `src/app/components/rsvp-form/rsvp-form.component.html`
- Modify: `public/assets/i18n/vi.json`
- Modify: `public/assets/i18n/en.json`
- Modify: `src/styles.scss`
- Test: `src/app/components/rsvp-form/rsvp-form.component.spec.ts`

**Interfaces:**
- Consumes: `cfg.rsvp.bus` từ Task 1 và `model.status`.
- Produces: `.bus-info-button`, `.bus-info`, `.bus-phone`.

- [ ] **Step 1: Viết test RSVP thất bại**

Thêm test render form, chọn trạng thái xe trên component và xác nhận:

```ts
expect(text('.rsvp-name-label')).toContain('rsvp.your_name');
expect(text('.rsvp-group-label')).toContain('rsvp.group');
expect(element.querySelector('.bus-info-button')?.textContent?.trim()).toBe('i');

fixture.componentInstance.model.status = 'bus';
fixture.detectChanges();
expect(element.querySelector('.bus-phone')).not.toBeNull();

fixture.componentInstance.showBusInfo = true;
fixture.detectChanges();
const busText = text('.bus-info');
expect(busText).toContain('7:30 17.10.2026');
expect(busText).toContain('10:30');
expect(busText).toContain('13:30');
expect(busText).toContain('17:30');
expect(element.querySelectorAll('.bus-info p')).toHaveLength(5);
```

Test validation hiện có vẫn phải xác nhận bắt buộc SĐT khi chọn xe.

- [ ] **Step 2: Chạy test để xác nhận RED**

Run: `npm test -- --watch=false`

Expected: FAIL vì ô SĐT đang phụ thuộc `showBusInfo`, icon là `ⓘ`, và thông tin xe nằm trên một dòng.

- [ ] **Step 3: Cập nhật bản dịch và template RSVP**

Đặt:

```json
{
  "rsvp": {
    "your_name": "Vui lòng nhập tên của bạn",
    "group": "Và nhóm",
    "phone": "Vui lòng nhập SĐT",
    "bus_departure": "Xe bắt đầu xuất phát",
    "bus_restaurant_arrival": "Dự kiến đến nhà hàng",
    "bus_return_departure": "Dự kiến xuất phát từ nhà hàng về lại HCM",
    "bus_hotel_arrival": "Dự kiến về đến Ibis hotel"
  }
}
```

Đặt nội dung tiếng Anh tương ứng.

Trong template:

- thêm class cho hai label chính;
- đổi nút info thành `<button class="bus-info-button">i</button>`;
- tách thông tin xe thành 5 thẻ `<p>`;
- đặt `@if (model.status === 'bus')` cho một `<label class="bus-phone">` nằm ngoài điều kiện `showBusInfo`.

CSS icon:

```scss
.bus-info-button {
  display: inline-grid;
  place-items: center;
  width: 1.25rem;
  height: 1.25rem;
  margin-left: .3rem;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #d8b9b9;
  color: #fff;
  font-family: Georgia, serif;
  font-size: .85rem;
  font-style: italic;
  line-height: 1;
}
```

- [ ] **Step 4: Chạy test để xác nhận GREEN**

Run: `npm test -- --watch=false`

Expected: toàn bộ test PASS.

---

### Task 5: Nối toàn bộ nội dung thành một dải nền kem

**Files:**
- Modify: `src/styles.scss`
- Verify: `src/app/pages/invite/invite.component.spec.ts`

**Interfaces:**
- Consumes: cấu trúc template từ Tasks 2–4.
- Produces: layout liên tục tại `.cover-hero + main.invite`.

- [ ] **Step 1: Xác nhận các test cấu trúc từ Tasks 2–4 đang xanh**

Các test trước đó đã khóa việc các phần vẫn nằm trong `main.invite`, không còn iframe và không còn tiêu đề Album:

```ts
const invite = element.querySelector('main.invite');
expect(invite?.querySelector('.invitation-sheet')).not.toBeNull();
expect(invite?.querySelector('app-map-calendar')).not.toBeNull();
expect(invite?.querySelector('app-rsvp-form')).not.toBeNull();
expect(invite?.querySelector('.album')).not.toBeNull();
expect(element.querySelector('iframe')).toBeNull();
expect(element.querySelector('.album h2')).toBeNull();
```

Run: `npm test -- --watch=false`

Expected: PASS; đây là baseline trước thay đổi chỉ liên quan trình bày.

- [ ] **Step 2: Cập nhật CSS liên tục**

Áp dụng:

```scss
.cover-hero {
  margin-bottom: 0;
  box-shadow: none;
}

main.invite {
  padding: 0;
  background: #fffdf8;
}

.invitation-sheet,
.map-cal,
app-rsvp-form form,
.album {
  margin: 0;
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
}

.map-cal,
app-rsvp-form form,
.album {
  padding: 2rem clamp(1rem, 5vw, 2.25rem);
  border-top: 1px solid rgba(201, 162, 75, .35);
}
```

Giữ khoảng đệm nội bộ, đường vàng mảnh và lưới ảnh; xóa các rule tạo card rời hoặc khoảng hở giữa các component.

- [ ] **Step 3: Chạy toàn bộ test**

Run: `npm test -- --watch=false`

Expected: toàn bộ test PASS.

- [ ] **Step 4: Build production**

Run: `npm run build`

Expected: exit code 0; ghi nhận riêng cảnh báo bundle budget nếu vẫn còn.

- [ ] **Step 5: Kiểm tra trình duyệt**

Chạy local và kiểm tra:

- mobile `390 × 844`;
- desktop `1280 × 900`;
- không tràn ngang;
- không có khoảng hở giữa bìa và nội dung;
- nền kem liên tục qua thiệp, nút, RSVP và ảnh;
- chọn xe tự hiện SĐT;
- icon `i` là vòng tròn hồng;
- không có Google Maps iframe;
- ba nút hành động hoạt động và nội dung lịch là `11:00–13:30`;
- console không có lỗi.
