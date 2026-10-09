import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { RsvpService } from '../../core/rsvp.service';
import { BusListComponent } from './bus-list.component';

describe('BusListComponent', () => {
  interface MarkCall {
    token: string;
    rsvpId: number;
    checked: boolean;
    note: string | null;
  }

  async function render(
    rows: unknown[],
    token: string | null = 'abcxyz',
    withPhone = false,
  ) {
    const requestedTokens: string[] = [];
    const phoneTokens: string[] = [];
    const markCalls: MarkCall[] = [];
    const setAllCalls: { token: string; checked: boolean }[] = [];
    await TestBed.configureTestingModule({
      imports: [BusListComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            data: of({ withPhone }),
            queryParamMap: of(convertToParamMap(token ? { t: token } : {})),
          },
        },
        {
          provide: RsvpService,
          useValue: {
            getPublicBusRsvps: async (requestedToken: string) => {
              requestedTokens.push(requestedToken);
              return rows;
            },
            getPublicBusAdminRsvps: async (requestedToken: string) => {
              phoneTokens.push(requestedToken);
              return rows;
            },
            setBusGuestMark: async (
              markToken: string,
              rsvpId: number,
              checked: boolean,
              note: string | null,
            ) => {
              markCalls.push({ token: markToken, rsvpId, checked, note });
            },
            setAllBusGuestChecks: async (setAllToken: string, checked: boolean) => {
              setAllCalls.push({ token: setAllToken, checked });
            },
          },
        },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(BusListComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return {
      fixture,
      element: fixture.nativeElement as HTMLElement,
      requestedTokens,
      phoneTokens,
      markCalls,
      setAllCalls,
    };
  }

  it('lists bus riders grouped by group with pickup, round-trip, counts, and companions', async () => {
    const { element, requestedTokens } = await render([
      {
        guest_name: 'Nhật An',
        category: 'Bạn của Mạnh',
        bus_pickup: 'hotel',
        bus_return: true,
        companions: ['Duy Mạnh'],
      },
      {
        guest_name: 'Bạn Tâm',
        category: 'Bạn của Tâm',
        bus_pickup: 'park',
        bus_return: false,
        companions: [],
      },
    ]);

    expect(requestedTokens).toEqual(['abcxyz']);
    expect(element.querySelector('header h3')?.textContent).toContain('Danh sách đi xe');
    expect(element.textContent).not.toContain('khách đăng ký');
    const subheads = Array.from(
      element.querySelectorAll('.group-subhead'),
      head => head.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(subheads).toEqual([
      'Bạn của Mạnh · 2 người',
      'Bạn của Tâm · 1 người',
    ]);
    const choices = Array.from(
      element.querySelectorAll('.guest-choice'),
      choice => choice.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(choices).toEqual([
      '(Đón: Ibis · Khứ hồi: Y)',
      '(Đón: CV Bình Phú · Khứ hồi: N)',
    ]);
    const numbers = Array.from(
      element.querySelectorAll('.guest-number'),
      node => node.textContent?.trim(),
    );
    expect(numbers).toEqual(['1.', '2.']);
    expect(element.querySelector('.companion-item')?.textContent?.replace(/\s+/g, ' ').trim())
      .toBe('+ Duy Mạnh');
    expect(element.querySelector('input')).toBeNull();
    expect(element.querySelector('button')).toBeNull();
  });

  it('shows phone numbers via the phone endpoint when withPhone is set', async () => {
    const { element, requestedTokens, phoneTokens } = await render(
      [
        {
          guest_name: 'Nhật An',
          category: 'Bạn của Mạnh',
          phone: '0909123456',
          bus_pickup: 'hotel',
          bus_return: true,
          companions: [],
        },
      ],
      'phonetoken',
      true,
    );

    expect(phoneTokens).toEqual(['phonetoken']);
    expect(requestedTokens).toEqual([]);
    expect(element.querySelector('header h3')?.textContent).toContain('kèm SĐT');
    expect(element.querySelector('.guest-choice')?.textContent).toContain('0909123456');
  });

  it('never renders a phone on the plain bus list', async () => {
    const { element } = await render([
      {
        guest_name: 'Nhật An',
        category: 'Bạn của Mạnh',
        bus_pickup: 'hotel',
        bus_return: true,
        companions: [],
      },
    ]);

    expect(element.querySelector('.guest-choice')?.textContent).not.toContain('☎');
  });

  it('does not request or reveal the list without a token', async () => {
    const { element, requestedTokens } = await render([], null);

    expect(requestedTokens).toEqual([]);
    expect(element.textContent).toContain('Liên kết xem danh sách không hợp lệ');
    expect(element.textContent).not.toContain('Chưa có ai đăng ký đi xe');
  });

  it('shows an empty state when nobody has chosen the bus', async () => {
    const { element } = await render([]);

    expect(element.textContent).toContain('Chưa có ai đăng ký đi xe');
  });

  it('sorts groups by name and sums people (with companions) per group', async () => {
    const { element } = await render([
      { guest_name: 'B1', category: 'Nhóm B', bus_pickup: 'hotel', bus_return: true, companions: ['x'] },
      { guest_name: 'A2', category: 'Nhóm A', bus_pickup: 'park', bus_return: false, companions: [] },
      { guest_name: 'A1', category: 'Nhóm A', bus_pickup: 'hotel', bus_return: true, companions: ['y', 'z'] },
    ]);

    const subheads = Array.from(
      element.querySelectorAll('.group-subhead'),
      head => head.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(subheads).toEqual([
      'Nhóm A · 4 người',
      'Nhóm B · 2 người',
    ]);
  });

  it('breaks the total down by pickup point and round-trip', async () => {
    const { element } = await render([
      { guest_name: 'A', category: 'N', bus_pickup: 'hotel', bus_return: true, companions: ['a2'] },
      { guest_name: 'B', category: 'N', bus_pickup: 'park', bus_return: true, companions: [] },
      { guest_name: 'C', category: 'N', bus_pickup: 'park', bus_return: false, companions: ['c2'] },
    ]);

    const stats = Array.from(
      element.querySelectorAll('.list-summary .stat'),
      node => node.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(stats).toEqual([
      'Tổng: 5',
      'Tân Bình: 2',
      'Quận 6: 3',
      'Khứ hồi: 3',
      'Ở lại: 2',
    ]);
    const labels = Array.from(element.querySelectorAll('.list-summary strong'), node => node.textContent);
    expect(labels).toEqual(['Tổng:', 'Tân Bình:', 'Quận 6:', 'Khứ hồi:', 'Ở lại:']);
  });

  it('renders a boarding checkbox and note button per guest only on the admin list', async () => {
    const { element } = await render(
      [{ rsvp_id: 7, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: false, note: null, companions: ['Mạnh'] }],
      'phonetoken',
      true,
    );

    expect(element.querySelector('input.board-check')).not.toBeNull();
    expect(element.querySelector('button.note-icon')).not.toBeNull();
  });

  it('persists a boarding tick through setBusGuestMark', async () => {
    const { fixture, element, markCalls } = await render(
      [{ rsvp_id: 7, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: false, note: 'cũ', companions: [] }],
      'phonetoken',
      true,
    );

    const checkbox = element.querySelector('input.board-check') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    await fixture.whenStable();

    expect(markCalls).toEqual([{ token: 'phonetoken', rsvpId: 7, checked: true, note: 'cũ' }]);
  });

  it('shows an existing guest note on the admin list', async () => {
    const { element } = await render(
      [{ rsvp_id: 7, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: true, note: 'Lên ở điểm phụ', companions: [] }],
      'phonetoken',
      true,
    );
    expect(element.querySelector('.note-text')?.textContent).toContain('Lên ở điểm phụ');
  });

  it('never renders checkbox, note button, or note on the plain list', async () => {
    const { element } = await render([
      { guest_name: 'An', category: 'N', bus_pickup: 'hotel', bus_return: true, companions: [] },
    ]);
    expect(element.querySelector('.board-check')).toBeNull();
    expect(element.querySelector('.note-icon')).toBeNull();
    expect(element.querySelector('.note-text')).toBeNull();
  });
  it('counts boarded people including companions against the total', async () => {
    const { element } = await render(
      [
        { rsvp_id: 1, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: true, note: null, companions: ['Mạnh', 'Tâm'] },
        { rsvp_id: 2, guest_name: 'Bình', category: 'N', phone: '091', bus_pickup: 'park', bus_return: true, checked: false, note: null, companions: [] },
      ],
      'phonetoken',
      true,
    );
    expect(element.querySelector('.board-actions span')?.textContent?.trim()).toBe('Đã lên xe: 3/4');
  });

  it('checks every guest after confirmation', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture, element, setAllCalls } = await render(
      [
        { rsvp_id: 1, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: false, note: null, companions: [] },
        { rsvp_id: 2, guest_name: 'Bình', category: 'N', phone: '091', bus_pickup: 'park', bus_return: true, checked: true, note: null, companions: [] },
      ],
      'phonetoken',
      true,
    );

    (element.querySelector('button.check-all') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(setAllCalls).toEqual([{ token: 'phonetoken', checked: true }]);
    const boxes = Array.from(element.querySelectorAll<HTMLInputElement>('input.board-check'));
    expect(boxes.map(box => box.checked)).toEqual([true, true]);
    vi.restoreAllMocks();
  });

  it('unchecks every guest after confirmation, keeping notes', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const { fixture, element, setAllCalls } = await render(
      [
        { rsvp_id: 1, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: true, note: 'giữ', companions: [] },
        { rsvp_id: 2, guest_name: 'Bình', category: 'N', phone: '091', bus_pickup: 'park', bus_return: true, checked: true, note: null, companions: [] },
      ],
      'phonetoken',
      true,
    );

    (element.querySelector('button.uncheck-all') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(setAllCalls).toEqual([{ token: 'phonetoken', checked: false }]);
    const boxes = Array.from(element.querySelectorAll<HTMLInputElement>('input.board-check'));
    expect(boxes.map(box => box.checked)).toEqual([false, false]);
    expect(element.querySelector('.note-text')?.textContent).toContain('giữ');
    vi.restoreAllMocks();
  });

  it('does nothing when the bulk confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const { fixture, element, setAllCalls } = await render(
      [{ rsvp_id: 1, guest_name: 'An', category: 'N', phone: '090', bus_pickup: 'hotel', bus_return: true, checked: true, note: null, companions: [] }],
      'phonetoken',
      true,
    );

    (element.querySelector('button.uncheck-all') as HTMLButtonElement).click();
    (element.querySelector('button.check-all') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(setAllCalls).toEqual([]);
    vi.restoreAllMocks();
  });
  it('links each phone for calling and copies it on demand', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { fixture, element } = await render(
      [{ rsvp_id: 1, guest_name: 'An', category: 'N', phone: '0909 123 456', bus_pickup: 'hotel', bus_return: true, checked: false, note: null, companions: [] }],
      'phonetoken',
      true,
    );

    expect(element.querySelector('a.phone-link')?.getAttribute('href')).toBe('tel:0909123456');
    (element.querySelector('button.phone-copy') as HTMLButtonElement).click();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(writeText).toHaveBeenCalledWith('0909 123 456');
    expect(element.querySelector('button.phone-copy')?.textContent?.trim()).toBe('✓');
  });

  it('falls back to a copy prompt when the clipboard is unavailable', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
      configurable: true,
    });
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue(null);
    const { fixture, element } = await render(
      [{ rsvp_id: 1, guest_name: 'An', category: 'N', phone: '0909123456', bus_pickup: 'hotel', bus_return: true, checked: false, note: null, companions: [] }],
      'phonetoken',
      true,
    );

    (element.querySelector('button.phone-copy') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(prompt).toHaveBeenCalledWith('Copy số điện thoại:', '0909123456');
    vi.restoreAllMocks();
  });
});
