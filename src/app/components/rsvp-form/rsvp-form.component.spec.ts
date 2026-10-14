import { TestBed } from '@angular/core/testing';
import { RsvpFormComponent } from './rsvp-form.component';
import { RsvpService } from '../../core/rsvp.service';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WEDDING } from '../../../assets/config/wedding.config';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

class RsvpStub {
  submitted: any = null;
  submitCount = 0;
  updated: any = null;
  failure: Error | null = null;
  private submitGate: Promise<void> | null = null;
  private releaseSubmit: (() => void) | null = null;

  delayNextSubmit() {
    this.submitGate = new Promise<void>(resolve => {
      this.releaseSubmit = resolve;
    });
    return () => this.releaseSubmit?.();
  }

  submit = async (d: any) => {
    if (this.failure) throw this.failure;
    if (this.submitGate) await this.submitGate;
    this.submitCount += 1;
    this.submitted = d;
    return { rsvpId: 21, editToken: 'a'.repeat(64) };
  };

  update = async (handle: any, d: any) => {
    if (this.failure) throw this.failure;
    this.updated = { handle, draft: d };
  };

  leaders: any[] = [];
  leaderFailure: Error | null = null;
  leaderHandles: any[] = [];
  getBusLeaders = async (handle: any) => {
    this.leaderHandles.push(handle);
    if (this.leaderFailure) throw this.leaderFailure;
    return this.leaders;
  };
}
describe('RsvpFormComponent', () => {
  let rsvp: RsvpStub;
  beforeEach(async () => {
    rsvp = new RsvpStub();
    await TestBed.configureTestingModule({
      imports: [RsvpFormComponent],
      providers: [
        provideTranslateService({}),
        { provide: RsvpService, useValue: rsvp },
        { provide: WEDDING_CONFIG, useValue: { ...WEDDING, rsvp: { ...WEDDING.rsvp, busRegistrationOpen: true } } },
      ],
    }).compileComponents();
  });

  it('requires name, group, and status before submit', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    expect(c.valid()).toBe(false);
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    expect(c.valid()).toBe(true);
  });

  it('requires phone when status is bus', () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'A'; c.model.category = 'IAS'; c.model.status = 'bus';
    expect(c.valid()).toBe(false);
    c.model.phone = '0900';
    expect(c.valid()).toBe(true);
  });

  it('allows the shuttle option while registration is open', async () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect((fixture.nativeElement.querySelector('input[type="radio"][value="bus"]') as HTMLInputElement).disabled).toBe(false);
    expect(fixture.nativeElement.querySelector('.bus-closed-note')).toBeNull();
  });

  it('closes only the shuttle option, with a contact note, once registration is closed', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', { rsvp: { bus_closed_note: 'Bác cần đi xe thì liên hệ nhà em đặt thêm nha' } });
    await firstValueFrom(translate.use('vi'));
    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    Object.defineProperty(c, 'busRegistrationClosed', { configurable: true, get: () => true });
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const radio = (value: string) => element.querySelector(`input[name="st"][value="${value}"]`) as HTMLInputElement;

    expect(radio('bus').disabled).toBe(true);
    expect(radio('self_transport').disabled).toBe(false);
    expect(radio('cannot_attend').disabled).toBe(false);
    expect(element.querySelector('.bus-closed-note')?.textContent?.trim()).toBe('Bác cần đi xe thì liên hệ nhà em đặt thêm nha');
    expect(element.querySelector('.warn')).toBeNull();

    radio('self_transport').click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(c.model.status).toBe('self_transport');

    c.model.guestName = 'A';
    c.model.category = 'IAS';
    c.model.phone = '0900000000';
    expect(c.valid()).toBe(true);
    c.model.status = 'bus';
    expect(c.valid()).toBe(false);
  });

  it('does not expose the guest list through browser autocomplete', () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    fixture.detectChanges();

    const input: HTMLInputElement | null =
      fixture.nativeElement.querySelector('input[name="name"]');
    expect(input?.hasAttribute('list')).toBe(false);
    expect(fixture.nativeElement.querySelector('datalist')).toBeNull();
  });

  it('uses the inset-arrow style for the group selector', () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.rsvp-group-select')).not.toBeNull();
  });

  it('pads the shuttle seat count, removes the trailing count, and celebrates a full table', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        bus: 'Tham dự và hốt {{count}} suất xe đưa đón khứ hồi HCM–CT',
        table_full: 'Chúc mừng bác đã sở hữu 1 bàn tiệc trọn vẹn!',
      },
    });
    await firstValueFrom(translate.use('vi'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.status = 'bus';
    fixture.detectChanges();

    const optionText = () =>
      fixture.nativeElement.querySelector('.bus-option-label')
        ?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    expect(optionText())
      .toContain('Tham dự và hốt 01 suất xe đưa đón khứ hồi HCM–CT');
    expect(fixture.nativeElement.querySelector('.bus-party-size')).toBeNull();
    expect(fixture.nativeElement.querySelector('.table-full-message')).toBeNull();

    for (let index = 0; index < 9; index++) {
      const addButton: HTMLButtonElement | null =
        fixture.nativeElement.querySelector('.companion-add');
      addButton?.click();
      fixture.detectChanges();

      const input = fixture.nativeElement
        .querySelectorAll('.companion-name')[index] as HTMLInputElement;
      input.value = `Khách ${index + 1}`;
      input.dispatchEvent(new Event('input'));
      fixture.detectChanges();
    }

    expect(optionText())
      .toContain('Tham dự và hốt 10 suất xe đưa đón khứ hồi HCM–CT');
    expect(fixture.nativeElement.querySelector('.companion-add')).toBeNull();
    const message: HTMLElement | null =
      fixture.nativeElement.querySelector('.table-full-message');
    const fieldset: HTMLFieldSetElement | null = fixture.nativeElement.querySelector('fieldset');
    expect(message?.textContent).toContain(
      'Chúc mừng bác đã sở hữu 1 bàn tiệc trọn vẹn!',
    );
    expect(message && fieldset
      ? Boolean(message.compareDocumentPosition(fieldset) & Node.DOCUMENT_POSITION_FOLLOWING)
      : false).toBe(true);
  });

  it('shows bus contact and the expanded five-part schedule', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', { rsvp: {
      your_name: 'Bác vui lòng cho em xin tên',
      bus_outbound_title: 'Xe khởi hành Hồ Chí Minh đi Cần Thơ:',
      departure_label: 'Xuất phát',
      bus_weekday: 'Thứ 7',
      location_label: 'Địa điểm',
      bus_outbound_location: 'IBIS SAIGON AIRPORT',
      bus_pickup1_label: 'Điểm đón 1',
      bus_pickup2_label: 'Điểm đón 2',
      bus_outbound_location_2: 'Cổng công viên Bình Phú',
      bus_restaurant_arrival: 'Dự kiến đến nhà hàng',
      bus_return_title: 'Xe khởi hành Cần Thơ về Hồ Chí Minh:',
      bus_return_departure_time: '{{time}} (dự kiến)',
      bus_return_location: 'Sảnh 01 Vạn Phát',
      bus_park_arrival: 'Dự kiến về đến Công viên Bình Phú',
      bus_hotel_arrival: 'Dự kiến về đến IBIS',
      bus_return_traffic_note: '(chiều về có thể kẹt xe trên cao tốc)',
      bus_info_hint: 'xem thông tin xe ở đây',
      bus_driver_update_note: 'Thông tin tài xế và thay đổi lịch trình (nếu có) sẽ được gửi vào SĐT của bác nha.',
      bus_driver_update_thanks: 'Xin cảm ơn.',
    } });
    await firstValueFrom(translate.use('vi'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const element: HTMLElement = fixture.nativeElement;
    const text = (selector: string) => element.querySelector(selector)?.textContent?.trim() ?? '';
    fixture.detectChanges();
    await fixture.whenStable();

    expect(text('.rsvp-name-label')).toContain('Bác vui lòng cho em xin tên');
    expect(text('.rsvp-group-label')).toContain('rsvp.group');
    expect(element.querySelector('.note')).toBeNull();
    expect(element.querySelector('.bus-info-button')).toBeNull();
    const busInfoHint: HTMLElement | null = element.querySelector('.bus-info-hint');
    expect(busInfoHint?.textContent).toContain('xem thông tin xe ở đây');
    expect(busInfoHint?.tagName).toBe('BUTTON');
    expect(busInfoHint?.querySelector('em')).not.toBeNull();
    const busHintIcon = busInfoHint?.querySelector('.bus-info-hint-icon');
    expect(busHintIcon?.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(busHintIcon?.querySelector('[stroke="currentColor"]')).not.toBeNull();
    expect(element.querySelector('.rsvp-privacy-note')).toBeNull();

    fixture.componentInstance.model.status = 'bus';
    fixture.detectChanges();
    expect(element.querySelector('.bus-phone')).not.toBeNull();

    fixture.componentInstance.showBusInfo = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const busText = text('.bus-info');
    expect(busText).toContain('Thứ 7 · 17.10.26');
    expect(busText).toContain('07:15');
    expect(busText).toContain('07:50');
    expect(busText).toContain('10:45');
    expect(busText).toContain('14:30');
    expect(busText).toContain('18:00');
    expect(busText).toContain('18:45');
    expect(busText).toContain('chiều về có thể kẹt xe trên cao tốc');
    expect(busText).not.toContain('Danh sách đi xe sẽ được chốt vào');
    expect(element.querySelector('.bus-registration-deadline')).toBeNull();
    const driverUpdateNote = element.querySelector('.bus-driver-update-note');
    expect(driverUpdateNote?.querySelector(':scope > em')).not.toBeNull();
    expect(driverUpdateNote?.querySelector('br')).not.toBeNull();
    expect(text('.bus-driver-update-note-main')).toBe(
      'Thông tin tài xế và thay đổi lịch trình (nếu có) sẽ được gửi vào SĐT của bác nha.',
    );
    expect(text('.bus-driver-update-note-thanks')).toBe('Xin cảm ơn.');
    const registrationNotes = element.querySelector('.bus-registration-notes');
    expect(registrationNotes?.children.length).toBe(1);
    expect(registrationNotes?.firstElementChild)
      .toBe(element.querySelector('.bus-driver-update-note'));
    expect(element.querySelectorAll('.bus-info p')).toHaveLength(8);
  });

  it('moves focus into the bus information and back to its trigger when closed', () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    fixture.detectChanges();

    const hintButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.bus-info-hint');
    hintButton.click();

    expect(document.activeElement)
      .toBe(fixture.nativeElement.querySelector('.bus-info-focus-target'));
    expect(hintButton.getAttribute('aria-expanded')).toBe('true');

    hintButton.click();

    expect(fixture.nativeElement.querySelector('.bus-info-focus-target')).toBeNull();
    expect(document.activeElement).toBe(hintButton);
    expect(hintButton.getAttribute('aria-expanded')).toBe('false');
  });

  it('renders the English bus schedule from translations', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { rsvp: {
      bus_outbound_title: 'Shuttle from Ho Chi Minh City to Can Tho:',
      departure_label: 'Departure',
      bus_weekday: 'Sat',
      location_label: 'Location',
      bus_outbound_location: 'IBIS SAIGON AIRPORT',
      bus_pickup1_label: 'Pickup point 1',
      bus_pickup2_label: 'Pickup point 2',
      bus_outbound_location_2: 'Binh Phu Park gate',
      bus_restaurant_arrival: 'Estimated arrival at the restaurant',
      bus_return_title: 'Shuttle from Can Tho to Ho Chi Minh City:',
      bus_return_departure_time: '{{time}} (estimated)',
      bus_return_location: 'Van Phat Hall 01',
      bus_park_arrival: 'Estimated arrival at Binh Phu Park',
      bus_hotel_arrival: 'Estimated arrival at IBIS',
      bus_return_traffic_note: '(return traffic may be congested on the expressway)',
      bus_driver_update_note: 'Driver details and any schedule changes will be sent to your phone number.',
      bus_driver_update_thanks: 'Thank you.',
    } });
    await firstValueFrom(translate.use('en'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const element: HTMLElement = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();

    fixture.componentInstance.showBusInfo = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const busText = element.querySelector('.bus-info')?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    expect(busText).toContain('Sat · 17.10.26');
    expect(busText).toContain('07:15');
    expect(busText).toContain('07:50');
    expect(busText).toContain('10:45');
    expect(busText).toContain('18:00');
    expect(busText).toContain('18:45');
    expect(busText).toContain('IBIS SAIGON AIRPORT');
    expect(busText)
      .not.toContain('The shuttle list will be finalized at');
    expect(busText)
      .toContain('Driver details and any schedule changes will be sent to your phone number. Thank you.');
    expect(busText).not.toContain('tại');
  });

  it('submits without checking for duplicate names', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    await c.trySubmit();

    expect(rsvp.submitted?.guestName).toBe('Duy Mạnh');
    expect(rsvp.submitted).not.toHaveProperty('deviceId');
  });

  it('updates the same RSVP after the guest opens the confirmation editor', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    await c.trySubmit();
    c.editResponse();
    c.model.status = 'cannot_attend';
    await c.trySubmit();

    expect(rsvp.submitCount).toBe(1);
    expect(rsvp.updated).toEqual({
      handle: { rsvpId: 21, editToken: 'a'.repeat(64) },
      draft: expect.objectContaining({
        guestName: 'Duy Mạnh',
        category: 'IAS',
        status: 'cannot_attend',
      }),
    });
  });

  it('allows the guest to change their name and group while editing an existing RSVP', async () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Duy Manh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    await c.trySubmit();
    c.editResponse();
    fixture.detectChanges();

    const nameInput: HTMLInputElement = fixture.nativeElement.querySelector('input[name="name"]');
    const groupSelect: HTMLSelectElement = fixture.nativeElement.querySelector('select[name="group"]');
    const selfTransport: HTMLInputElement = fixture.nativeElement.querySelector(
      'input[value="self_transport"]',
    );

    expect(nameInput.disabled).toBe(false);
    expect(groupSelect.disabled).toBe(false);
    expect(selfTransport.disabled).toBe(false);

    c.model.guestName = 'Nhật An';
    c.model.category = 'Tiến bước';
    await c.trySubmit();

    expect(rsvp.updated?.draft).toEqual(expect.objectContaining({
      guestName: 'Nhật An',
      category: 'Tiến bước',
    }));
  });

  it('shows an error and re-enables submission when the RSVP request fails', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        submit: 'Gửi xác nhận',
        submitting: 'Đang gửi...',
        submit_error: 'Không thể gửi xác nhận. Vui lòng thử lại.',
      },
      invite: { confirm: 'Xác nhận tham dự' },
    });
    await firstValueFrom(translate.use('vi'));

    rsvp.failure = new Error('permission denied');
    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    await c.trySubmit();

    const submissionState = c as unknown as { submitting: boolean; submitFailed: boolean };
    expect(submissionState.submitting).toBe(false);
    expect(submissionState.submitFailed).toBe(true);
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent)
      .toContain('Không thể gửi xác nhận');
    expect(document.activeElement)
      .toBe(fixture.nativeElement.querySelector('[role="alert"]'));
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.disabled)
      .toBe(false);
  });

  it('renders the thank-you state when an asynchronous submission finishes', async () => {
    const releaseSubmit = rsvp.delayNextSubmit();
    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    const submission = c.trySubmit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('button[type="submit"]')?.disabled)
      .toBe(true);

    releaseSubmit();
    await submission;
    await Promise.resolve();

    expect(fixture.nativeElement.querySelector('.thanks')).not.toBeNull();
    expect(document.activeElement)
      .toBe(fixture.nativeElement.querySelector('.rsvp-confirmation'));
  });

  it('confirms a bus RSVP with the personalized thanks, named guest list, and bus details', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        confirmation_thanks: 'Cảm ơn bác {{name}} đã dành thời gian xác nhận!',
        confirmation_bus: 'Bác đã lựa chọn tham dự & hốt {{count}} suất xe đưa đón khứ hồi HCM–CT cho',
        bus_outbound_title: 'Xe khởi hành Hồ Chí Minh đi Cần Thơ:',
        departure_label: 'Xuất phát',
        bus_weekday: 'Thứ 7',
        location_label: 'Địa điểm',
        bus_outbound_location: 'IBIS SAIGON AIRPORT',
        bus_pickup1_label: 'Điểm đón 1',
        bus_pickup2_label: 'Điểm đón 2',
        bus_outbound_location_2: 'Cổng công viên Bình Phú',
        bus_restaurant_arrival: 'Dự kiến đến nhà hàng',
        bus_return_title: 'Xe khởi hành Cần Thơ về Hồ Chí Minh:',
        bus_return_departure_time: '{{time}} (dự kiến)',
        bus_return_location: 'Sảnh 01 Vạn Phát',
        bus_park_arrival: 'Dự kiến về đến Công viên Bình Phú',
        bus_hotel_arrival: 'Dự kiến về đến IBIS',
        bus_return_traffic_note: '(chiều về có thể kẹt xe trên cao tốc)',
        pickup_at_label: 'Đón tại',
        pickup_hotel: 'Ibis hotel (Tân Bình cũ)',
        no_return_label: 'Không theo xe về HCM',
        bus_driver_update_note: 'Thông tin tài xế và thay đổi lịch trình (nếu có) sẽ được gửi vào SĐT của bác nha.',
        bus_driver_update_thanks: 'Xin cảm ơn.',
        edit_response: 'Chỉnh sửa',
      },
      invite: { confirm: 'Xác nhận tham dự' },
    });
    await firstValueFrom(translate.use('vi'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'bus';
    c.model.phone = '0900';
    c.companions = [{ name: 'Bé An' }] as any;
    fixture.detectChanges();

    await c.trySubmit();

    expect(rsvp.submitted?.companions).toEqual([
      { name: 'Bé An', joinsBus: true },
    ]);
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation h2')?.textContent)
      .toContain('Cảm ơn bác Duy Mạnh đã dành thời gian xác nhận!');
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation-count')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation-summary')?.textContent)
      .toContain('Bác đã lựa chọn tham dự & hốt 02 suất xe đưa đón khứ hồi HCM–CT cho');
    const confirmedGuests = Array.from(
      fixture.nativeElement.querySelectorAll('.rsvp-confirmation-guests li'),
    ) as HTMLElement[];
    expect(confirmedGuests.map(item => ({
      check: item.querySelector('.rsvp-confirmation-check')?.textContent?.trim(),
      name: item.querySelector('.rsvp-confirmation-name')?.textContent?.trim(),
    }))).toEqual([
      { check: '✓', name: 'Duy Mạnh (IAS)' },
      { check: '✓', name: 'Bé An' },
    ]);
    expect(confirmedGuests.map(item =>
      item.querySelector('.rsvp-confirmation-name')?.tagName,
    )).toEqual(['STRONG', 'STRONG']);
    const confirmedBusInfo: HTMLElement | null =
      fixture.nativeElement.querySelector('.rsvp-confirmation .bus-info');
    expect(confirmedBusInfo?.textContent).toContain('Thứ 7 · 17.10.26');
    expect(confirmedBusInfo?.textContent).toContain('07:15');
    expect(confirmedBusInfo?.textContent).toContain('10:45');
    expect(confirmedBusInfo?.textContent).toContain('14:30');
    expect(confirmedBusInfo?.textContent).toContain('18:00');
    expect(confirmedBusInfo?.textContent).toContain('18:45');
    expect(confirmedBusInfo?.textContent)
      .toContain('chiều về có thể kẹt xe trên cao tốc');
    expect(confirmedBusInfo?.textContent)
      .not.toContain('Danh sách đi xe sẽ được chốt vào');
    expect(confirmedBusInfo?.querySelector('.bus-driver-update-note-main')?.textContent?.trim())
      .toBe('Thông tin tài xế và thay đổi lịch trình (nếu có) sẽ được gửi vào SĐT của bác nha.');
    expect(confirmedBusInfo?.querySelector('.bus-driver-update-note-thanks')?.textContent?.trim())
      .toBe('Xin cảm ơn.');
    expect(confirmedBusInfo?.querySelector('a')?.getAttribute('href'))
      .toBe('https://maps.app.goo.gl/A4G9MXVdHavg2cTq6');
    expect(confirmedBusInfo?.querySelectorAll('.bus-leg-title')).toHaveLength(2);
    expect(confirmedBusInfo?.querySelectorAll('strong.bus-info-label')).toHaveLength(7);

    const editButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.rsvp-edit-response');
    expect(editButton?.textContent).toContain('Chỉnh sửa');
    expect(editButton).toBe(fixture.nativeElement.querySelector('.rsvp-confirmation > :last-child'));
    editButton?.click();
    fixture.detectChanges();

    const form: HTMLFormElement | null = fixture.nativeElement.querySelector('form');
    expect(form?.hidden).toBe(false);
    expect(document.activeElement)
      .toBe(fixture.nativeElement.querySelector('input[name="name"]'));
    expect(c.model.guestName).toBe('Duy Mạnh');
    expect(c.companions).toEqual([{ name: 'Bé An' }]);
  });

  it('confirms a self-transport RSVP with the named guest list and no bus details', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        confirmation_thanks: 'Cảm ơn bác {{name}} đã dành thời gian xác nhận!',
        confirmation_self_transport: 'Bác đã chọn tham dự & tự di chuyển cho',
        edit_response: 'Chỉnh sửa',
      },
    });
    await firstValueFrom(translate.use('vi'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Nhật An';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';
    c.companions = [{ name: 'Bé Quỳnh Anh' }] as any;

    await c.trySubmit();

    expect(fixture.nativeElement.querySelector('.rsvp-confirmation h2')?.textContent)
      .toContain('Cảm ơn bác Nhật An đã dành thời gian xác nhận!');
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation-summary')?.textContent)
      .toContain('Bác đã chọn tham dự & tự di chuyển cho');
    expect(Array.from(
      fixture.nativeElement.querySelectorAll('.rsvp-confirmation-name'),
      (element: Element) => element.textContent?.trim(),
    )).toEqual(['Nhật An (IAS)', 'Bé Quỳnh Anh']);
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation-count')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation .bus-info')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rsvp-edit-response')?.textContent)
      .toContain('Chỉnh sửa');
  });

  it('shows only the personalized thanks and edit button when the guest cannot attend', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        confirmation_thanks: 'Cảm ơn bác {{name}} đã dành thời gian xác nhận!',
        edit_response: 'Chỉnh sửa',
      },
    });
    await firstValueFrom(translate.use('vi'));

    const fixture = TestBed.createComponent(RsvpFormComponent);
    const c = fixture.componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'cannot_attend';

    await c.trySubmit();

    expect(fixture.nativeElement.querySelector('.rsvp-confirmation h2')?.textContent)
      .toContain('Cảm ơn bác Duy Mạnh đã dành thời gian xác nhận!');
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation-details')).toBeNull();
    expect(fixture.nativeElement.querySelector('.rsvp-confirmation .bus-info')).toBeNull();
    const editButton: HTMLButtonElement | null =
      fixture.nativeElement.querySelector('.rsvp-edit-response');
    expect(editButton?.textContent).toContain('Chỉnh sửa');
    expect(editButton).toBe(fixture.nativeElement.querySelector('.rsvp-confirmation > :last-child'));
  });
  describe('bus leader info after confirming the bus', () => {
    async function confirm(status: 'bus' | 'self_transport') {
      const translate = TestBed.inject(TranslateService);
      translate.setTranslation('vi', {
        rsvp: {
          bus_leader_intro: 'Đây là thông tin trưởng đoàn và link nhóm Zalo để tiện trao đổi trong lúc di chuyển, mời bạn tham gia nhé:',
          bus_leader_label: 'Trưởng đoàn',
          bus_leader_zalo_label: 'Link Zalo',
        },
      });
      await firstValueFrom(translate.use('vi'));
      const fixture = TestBed.createComponent(RsvpFormComponent);
      const c = fixture.componentInstance;
      c.model.guestName = 'Duy Mạnh';
      c.model.category = 'IAS';
      c.model.status = status;
      c.model.phone = '0900';
      fixture.detectChanges();
      await c.trySubmit();
      await fixture.whenStable();
      fixture.detectChanges();
      return fixture.nativeElement as HTMLElement;
    }

    it('shows the leader, phone and Zalo link to a guest who chose the bus', async () => {
      rsvp.leaders = [{ name: 'Anh Tâm', phone: '0909 111 222', zalo_link: 'https://zalo.me/g/abc' }];
      const element = await confirm('bus');

      expect(rsvp.leaderHandles).toEqual([{ rsvpId: 21, editToken: 'a'.repeat(64) }]);
      const block = element.querySelector('.rsvp-confirmation .bus-leader-info');
      expect(block?.querySelector('p')?.textContent?.trim()).toBe(
        'Đây là thông tin trưởng đoàn và link nhóm Zalo để tiện trao đổi trong lúc di chuyển, mời bạn tham gia nhé:',
      );
      const items = Array.from(block?.querySelectorAll('li') ?? [], li => li.textContent?.replace(/\s+/g, ' ').trim());
      expect(items).toEqual(['Trưởng đoàn: Anh Tâm - 0909 111 222', 'Link Zalo: https://zalo.me/g/abc']);
      const links = Array.from(block?.querySelectorAll('a') ?? []) as HTMLAnchorElement[];
      expect(links.map(a => a.getAttribute('href'))).toEqual(['tel:0909 111 222', 'https://zalo.me/g/abc']);
      expect(links[1].getAttribute('target')).toBe('_blank');
    });

    it('shows nothing while no leader has been entered', async () => {
      const element = await confirm('bus');
      expect(element.querySelector('.bus-leader-info')).toBeNull();
    });

    it('shows nothing when the leader lookup fails', async () => {
      rsvp.leaders = [{ name: 'Anh Tâm', phone: null, zalo_link: null }];
      rsvp.leaderFailure = new Error('denied');
      const element = await confirm('bus');
      expect(element.querySelector('.bus-leader-info')).toBeNull();
    });

    it('never asks for leader info when the guest travels on their own', async () => {
      rsvp.leaders = [{ name: 'Anh Tâm', phone: '0909', zalo_link: 'https://zalo.me/g/abc' }];
      const element = await confirm('self_transport');
      expect(rsvp.leaderHandles).toEqual([]);
      expect(element.querySelector('.bus-leader-info')).toBeNull();
    });
  });
});
