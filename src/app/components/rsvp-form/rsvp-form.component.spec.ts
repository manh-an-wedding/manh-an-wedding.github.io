import { TestBed } from '@angular/core/testing';
import { RsvpFormComponent } from './rsvp-form.component';
import { RsvpService } from '../../core/rsvp.service';
import { DeviceIdService } from '../../core/device-id.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

class RsvpStub {
  submitted: any = null;
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
    this.submitted = d;
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
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } },
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

  it('closes only shuttle registration after the local deadline', () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    Object.defineProperty(c, 'deadlinePassed', { configurable: true, get: () => true });
    c.model.guestName = 'A';
    c.model.category = 'IAS';
    c.model.phone = '0900000000';

    c.model.status = 'bus';
    expect(c.valid()).toBe(false);

    c.model.status = 'self_transport';
    expect(c.valid()).toBe(true);
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

  it('pads shuttle slots, removes the trailing count, and celebrates a full table', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('vi', {
      rsvp: {
        bus: 'Tham dự và hốt {{count}} slot xe đưa đón khứ hồi HCM–CT',
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
      .toContain('Tham dự và hốt 01 slot xe đưa đón khứ hồi HCM–CT');
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
      .toContain('Tham dự và hốt 10 slot xe đưa đón khứ hồi HCM–CT');
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
      bus_outbound_departure: '07:30 - 17.10.2026',
      location_label: 'Địa điểm',
      bus_outbound_location: 'IBIS SAIGON AIRPORT',
      bus_restaurant_arrival: 'Dự kiến đến nhà hàng',
      bus_return_title: 'Xe khởi hành Cần Thơ về Hồ Chí Minh:',
      bus_return_departure_time: '13:30 (dự kiến)',
      bus_return_location: 'Sảnh 01 Vạn Phát',
      bus_hotel_arrival: 'Dự kiến về đến IBIS',
      bus_return_traffic_note: '(chiều về có thể kẹt xe trên cao tốc)',
      bus_deadline_prefix: 'Danh sách đi xe sẽ được chốt vào',
      bus_deadline_detail: '11:30 AM thứ 7, 10.10.2026',
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
    expect(element.querySelector('.bus-info-button')?.textContent?.trim()).toBe('i');

    fixture.componentInstance.model.status = 'bus';
    fixture.detectChanges();
    expect(element.querySelector('.bus-phone')).not.toBeNull();

    fixture.componentInstance.showBusInfo = true;
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const busText = text('.bus-info');
    expect(busText).toContain('07:30 - 17.10.2026');
    expect(busText).toContain('10:30');
    expect(busText).toContain('13:30');
    expect(busText).toContain('17:00');
    expect(busText).toContain('chiều về có thể kẹt xe trên cao tốc');
    expect(busText)
      .toContain('Danh sách đi xe sẽ được chốt vào 11:30 AM thứ 7, 10.10.2026');
    expect(element.querySelector('.bus-registration-deadline > em')).not.toBeNull();
    expect(Array.from(
      element.querySelectorAll('.bus-registration-deadline strong'),
      (item: Element) => item.textContent?.trim(),
    )).toEqual(['11:30 AM thứ 7, 10.10.2026']);
    expect(element.querySelectorAll('.bus-info p')).toHaveLength(7);
  });

  it('moves focus into the bus information and back to its trigger when closed', () => {
    const fixture = TestBed.createComponent(RsvpFormComponent);
    fixture.detectChanges();

    const infoButton: HTMLButtonElement =
      fixture.nativeElement.querySelector('.bus-info-button');
    infoButton.click();

    expect(document.activeElement)
      .toBe(fixture.nativeElement.querySelector('.bus-info-focus-target'));

    infoButton.click();

    expect(fixture.nativeElement.querySelector('.bus-info-focus-target')).toBeNull();
    expect(document.activeElement).toBe(infoButton);
  });

  it('renders the English bus schedule from translations', async () => {
    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', { rsvp: {
      bus_outbound_title: 'Shuttle from Ho Chi Minh City to Can Tho:',
      departure_label: 'Departure',
      bus_outbound_departure: '07:30 - 17.10.2026',
      location_label: 'Location',
      bus_outbound_location: 'IBIS SAIGON AIRPORT',
      bus_restaurant_arrival: 'Estimated arrival at the restaurant',
      bus_return_title: 'Shuttle from Can Tho to Ho Chi Minh City:',
      bus_return_departure_time: '13:30 (estimated)',
      bus_return_location: 'Van Phat Hall 01',
      bus_hotel_arrival: 'Estimated arrival at IBIS',
      bus_return_traffic_note: '(return traffic may be congested on the expressway)',
      bus_deadline_prefix: 'The shuttle list will be finalized at',
      bus_deadline_detail: '11:30 AM Saturday, 10.10.2026',
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
    expect(busText).toContain('07:30 - 17.10.2026');
    expect(busText).toContain('IBIS SAIGON AIRPORT');
    expect(busText)
      .toContain('The shuttle list will be finalized at 11:30 AM Saturday, 10.10.2026');
    expect(busText).not.toContain('tại');
  });

  it('submits without checking for duplicate names', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'Duy Mạnh';
    c.model.category = 'IAS';
    c.model.status = 'self_transport';

    await c.trySubmit();

    expect(rsvp.submitted?.guestName).toBe('Duy Mạnh');
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
        confirmation_bus: 'Bác đã lựa chọn tham dự & hốt {{count}} slot xe đưa đón khứ hồi HCM–CT cho',
        bus_outbound_title: 'Xe khởi hành Hồ Chí Minh đi Cần Thơ:',
        departure_label: 'Xuất phát',
        bus_outbound_departure: '07:30 - 17.10.2026',
        location_label: 'Địa điểm',
        bus_outbound_location: 'IBIS SAIGON AIRPORT',
        bus_restaurant_arrival: 'Dự kiến đến nhà hàng',
        bus_return_title: 'Xe khởi hành Cần Thơ về Hồ Chí Minh:',
        bus_return_departure_time: '13:30 (dự kiến)',
        bus_return_location: 'Sảnh 01 Vạn Phát',
        bus_hotel_arrival: 'Dự kiến về đến IBIS',
        bus_return_traffic_note: '(chiều về có thể kẹt xe trên cao tốc)',
        bus_deadline_prefix: 'Danh sách đi xe sẽ được chốt vào',
        bus_deadline_detail: '11:30 AM thứ 7, 10.10.2026',
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
      .toContain('Bác đã lựa chọn tham dự & hốt 02 slot xe đưa đón khứ hồi HCM–CT cho');
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
    expect(confirmedBusInfo?.textContent).toContain('07:30 - 17.10.2026');
    expect(confirmedBusInfo?.textContent).toContain('10:30');
    expect(confirmedBusInfo?.textContent).toContain('13:30');
    expect(confirmedBusInfo?.textContent).toContain('17:00');
    expect(confirmedBusInfo?.textContent)
      .toContain('chiều về có thể kẹt xe trên cao tốc');
    expect(confirmedBusInfo?.textContent)
      .toContain('Danh sách đi xe sẽ được chốt vào');
    expect(Array.from(
      confirmedBusInfo?.querySelectorAll('.bus-registration-deadline strong') ?? [],
      (item: Element) => item.textContent?.trim(),
    )).toEqual(['11:30 AM thứ 7, 10.10.2026']);
    expect(confirmedBusInfo?.querySelector('a')?.getAttribute('href'))
      .toBe('https://maps.app.goo.gl/A4G9MXVdHavg2cTq6');

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
});
