import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import {
  AdminDashboard,
  AdminDuplicateRow,
  AdminRsvpRow,
  RsvpService,
} from '../../core/rsvp.service';
import { AdminComponent } from './admin.component';

const currentRow: AdminRsvpRow = {
  id: 21,
  guest_name: 'Nhật An',
  name_norm: 'nhat an',
  category: 'Tiến bước',
  status: 'bus',
  phone: '0900000000',
  party_size: 2,
  created_at: '2026-08-02T10:00:00Z',
  superseded_by_id: null,
  duplicate_of_id: null,
  duplicate_status: null,
  invalidated_at: null,
  invalidated_by: null,
  invalid_reason: null,
  data_check: false,
  companions: [{
    id: 31, name: 'Duy Mạnh', joins_bus: true, relation: null,
  }],
};

const duplicate: AdminDuplicateRow = {
  candidate_id: 20,
  candidate_guest_name: 'Nhật An',
  candidate_category: 'IAS',
  candidate_status: 'self_transport',
  candidate_phone: null,
  candidate_party_size: 1,
  candidate_created_at: '2026-08-01T10:00:00Z',
  target_id: 21,
  target_guest_name: 'Nhật An',
  target_category: 'Tiến bước',
  target_status: 'bus',
  target_phone: '0900000000',
  target_party_size: 2,
  target_created_at: '2026-08-02T10:00:00Z',
  candidate_duplicate_status: 'pending',
  candidate_duplicate_reviewed_at: null,
  candidate_duplicate_reviewed_by: null,
};

const dashboard: AdminDashboard = {
  summary: {
    rawRsvpCount: 5,
    currentRsvpCount: 3,
    attendingPeople: 4,
    pendingDuplicateCount: 1,
    busGuestSeats: 1,
    busCompanionSeats: 1,
  },
  current: [currentRow],
  history: [currentRow],
  duplicates: [duplicate],
  busCurrent: [currentRow],
  busHistory: [currentRow],
  groups: ['Tiến bước', 'IAS'],
};

function fakeAdminService(hasSession: boolean) {
  const calls: { method: string; args?: unknown[] }[] = [];
  return {
    calls,
    async hasAdminSession() { return hasSession; },
    async signInAdmin(email: string, password: string) {
      calls.push({ method: 'signInAdmin', args: [email, password] });
    },
    async signOutAdmin() { calls.push({ method: 'signOutAdmin' }); },
    async getAdminDashboard() { return dashboard; },
    async updateAdminRsvp(value: unknown) {
      calls.push({ method: 'updateAdminRsvp', args: [value] });
      return 21;
    },
    async setRsvpDataCheck(id: number, checked: boolean) {
      calls.push({ method: 'setRsvpDataCheck', args: [id, checked] });
    },
    async reviewDuplicate(candidateId: number, targetId: number, status: string) {
      calls.push({
        method: 'reviewDuplicate', args: [candidateId, targetId, status],
      });
    },
    async setRsvpInvalidated(id: number, invalidated: boolean, reason?: string) {
      calls.push({ method: 'setRsvpInvalidated', args: [id, invalidated, reason] });
    },
  };
}

describe('AdminComponent', () => {
  async function render(hasSession: boolean) {
    const service = fakeAdminService(hasSession);
    await TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: RsvpService, useValue: service },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    await vi.waitFor(() => {
      expect(fixture.componentInstance.authenticated()).not.toBeNull();
    });
    if (hasSession) {
      await vi.waitFor(() => {
        expect(fixture.componentInstance.dashboard().summary.currentRsvpCount)
          .toBe(3);
      });
    }
    fixture.detectChanges();
    return { fixture, service };
  }

  it('shows an email/password login when there is no admin session', async () => {
    const { fixture } = await render(false);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).not.toContain('Đăng nhập quản trị');
    expect(element.querySelector('.login-card h1')).toBeNull();
    expect(element.querySelector('input[type="email"]')).not.toBeNull();
    expect(element.querySelector('input[type="password"]')).not.toBeNull();
  });

  it('loads overview totals and current RSVP data for an admin session', async () => {
    const { fixture } = await render(true);
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Tổng quan');
    const processedCard = Array.from(element.querySelectorAll('.summary article'))
      .find(card => card.textContent?.includes('xác nhận đã xử lý'));
    expect(processedCard?.querySelector('strong')?.textContent).toBe('3');
    expect(element.textContent).toContain('xác nhận đã xử lý');
    expect(element.textContent).toContain('ghế đã xử lý');
    expect(element.textContent).not.toContain('ghế xe hiện hành');
    expect(element.textContent).toContain('Nhật An');
    expect(element.textContent).toContain('Tiến bước');
  });

  it('orders overview statistics by attendance, seats, processed, raw, then duplicates', async () => {
    const { fixture } = await render(true);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.summary article span'),
      item => item.textContent?.trim(),
    );

    expect(labels).toEqual([
      'người tham dự',
      'ghế đã xử lý',
      'xác nhận đã xử lý',
      'bản ghi raw',
      'trùng chờ duyệt',
    ]);
  });

  it('logs in then opens the dashboard', async () => {
    const { fixture, service } = await render(false);
    const component = fixture.componentInstance as any;
    component.email = 'owner@example.com';
    component.password = 'secret';

    await component.login();

    expect(service.calls).toContainEqual({
      method: 'signInAdmin', args: ['owner@example.com', 'secret'],
    });
    expect(component.authenticated()).toBe(true);
  });

  it('filters current RSVP rows by search text and group', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;

    component.search.set('không có');
    expect(component.visibleRows()).toEqual([]);
    component.search.set('nhật');
    component.groupFilter.set('Tiến bước');
    expect(component.visibleRows()).toEqual([currentRow]);
  });

  it('saves admin edits directly on the selected RSVP', async () => {
    const { fixture, service } = await render(true);
    const component = fixture.componentInstance as any;
    component.startEdit(currentRow);
    component.editDraft.guestName = 'Nhật An mới';

    await component.saveEdit();

    expect(service.calls).toContainEqual({
      method: 'updateAdminRsvp',
      args: [expect.objectContaining({
        sourceId: 21,
        guestName: 'Nhật An mới',
        category: 'Tiến bước',
      })],
    });
  });

  it('uses processed and raw labels for RSVP and shuttle tabs', async () => {
    const { fixture } = await render(true);
    const labels = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.tabs button'),
      button => button.textContent?.trim(),
    );

    expect(labels).toEqual([
      'Tổng quan',
      'RSVP đã xử lý',
      'Raw RSVP',
      'DS xe đã xử lý',
      'Raw DS Xe',
      'Duyệt trùng',
    ]);
  });

  it('paginates admin RSVP tables at twenty rows per page', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      current: Array.from({ length: 21 }, (_, index) => ({
        ...currentRow,
        id: index + 1,
        guest_name: `Khách ${index + 1}`,
        name_norm: `khach ${index + 1}`,
      })),
    });
    component.selectTab('current');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('tbody tr')).toHaveLength(20);
    expect(element.querySelector('.pagination-status')?.textContent?.trim())
      .toBe('Trang 1 / 2');

    (element.querySelector('button[aria-label="Trang sau"]') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(element.querySelector('tbody')?.textContent).toContain('Khách 21');
    expect(element.querySelector('.pagination-status')?.textContent?.trim())
      .toBe('Trang 2 / 2');
  });

  it('paginates duplicate review cards at twenty rows per page', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      duplicates: Array.from({ length: 21 }, (_, index) => ({
        ...duplicate,
        candidate_id: index + 1,
        target_id: index + 101,
      })),
    });
    component.selectTab('duplicates');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('.duplicate-card')).toHaveLength(20);
    (element.querySelector('button[aria-label="Trang sau"]') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(element.querySelectorAll('.duplicate-card')).toHaveLength(1);
  });

  it('exports the processed shuttle list as one driver-friendly row per passenger', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    const firstBusRsvp: AdminRsvpRow = {
      ...currentRow,
      id: 32,
      guest_name: 'Khách chính 1',
      phone: '0900000032',
      companions: [{
        id: 3201,
        name: 'Khách đính kèm 1',
        joins_bus: true,
        relation: null,
      }],
    };
    const secondBusRsvp: AdminRsvpRow = {
      ...currentRow,
      id: 39,
      guest_name: 'Khách chính 2',
      phone: '0900000039',
      companions: [
        { id: 3901, name: 'Khách kèm 2', joins_bus: true, relation: null },
        { id: 3902, name: 'Khách kèm 3', joins_bus: true, relation: null },
      ],
    };
    component.selectTab('busCurrent');

    const csv = component.buildCsv([firstBusRsvp, secondBusRsvp]);

    expect(csv.split('\r\n')).toEqual([
      '"STT","Tên","SĐT","ID"',
      '"1","Khách chính 1","0900000032","32"',
      '"2","Khách đính kèm 1","-","32"',
      '"3","Khách chính 2","0900000039","39"',
      '"4","Khách kèm 2","-","39"',
      '"5","Khách kèm 3","-","39"',
    ]);
  });

  it('neutralizes spreadsheet formulas in exported guest data', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.selectTab('busCurrent');

    const csv = component.buildCsv([{
      ...currentRow,
      guest_name: '=HYPERLINK("https://example.com")',
      phone: '+84900000000',
      status: 'bus',
      companions: [{
        id: 2201,
        name: '@SUM(1+1)',
        joins_bus: true,
        relation: null,
      }],
    }]);

    expect(csv).toContain('"\t=HYPERLINK(""https://example.com"")"');
    expect(csv).toContain('"\t+84900000000"');
    expect(csv).toContain('"\t@SUM(1+1)"');
  });

  it('colors raw rows by new, superseded, pending duplicate, and reviewed state', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      history: [
        currentRow,
        { ...currentRow, id: 10, superseded_by_id: 21 },
        { ...currentRow, id: 11, duplicate_of_id: 21, duplicate_status: 'pending' },
        { ...currentRow, id: 12, duplicate_of_id: 21, duplicate_status: 'rejected' },
        { ...currentRow, id: 13, duplicate_of_id: 21, duplicate_status: 'confirmed' },
      ],
    });
    component.selectTab('history');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelectorAll('tr.raw-state-new')).toHaveLength(2);
    expect(element.querySelectorAll('tr.raw-state-superseded')).toHaveLength(2);
    expect(element.querySelectorAll('tr.raw-state-duplicate')).toHaveLength(1);
    expect(element.querySelector('.raw-state-duplicate .duplicate-warning')?.textContent)
      .toBe('⚠');
    expect(element.querySelector('.raw-status.new')?.textContent?.trim()).toBe('Mới');
    expect(element.querySelector('.raw-status.superseded')?.textContent?.trim())
      .toBe('Đã thay đổi');
    expect(element.querySelector('.raw-status.reviewed-unique')?.textContent?.trim())
      .toBe('Đã xử lý (không trùng)');
    expect(element.querySelector('.raw-status.reviewed-duplicate')?.textContent?.trim())
      .toBe('Đã xử lý (bị trùng)');
    expect(element.querySelectorAll('.data-check-toggle')).toHaveLength(5);
  });

  it('shows invalidated raw RSVP rows in gray and restores them through the admin RPC', async () => {
    const { fixture, service } = await render(true);
    const component = fixture.componentInstance as any;
    const invalidated = {
      ...currentRow,
      invalidated_at: '2026-08-03T10:00:00Z',
      invalidated_by: '00000000-0000-0000-0000-000000000001',
      invalid_reason: 'Dữ liệu test',
    };
    component.dashboard.set({ ...dashboard, history: [invalidated] });
    component.selectTab('history');
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('tr.raw-state-invalidated')).not.toBeNull();
    expect(element.querySelector('.raw-status.invalidated')?.textContent?.trim())
      .toBe('Đã loại');
    expect(element.textContent).toContain('Dữ liệu test');

    await component.restoreRsvp(invalidated);
    expect(service.calls).toContainEqual({
      method: 'setRsvpInvalidated', args: [21, false, undefined],
    });
  });

  it('does not treat pre-migration rows without invalidation fields as invalidated', async () => {
    const { fixture } = await render(true);
    const legacyRow = { ...currentRow } as Partial<AdminRsvpRow>;
    delete legacyRow.invalidated_at;
    delete legacyRow.invalidated_by;
    delete legacyRow.invalid_reason;

    expect((fixture.componentInstance as any).rowState(legacyRow)).toBe('new');
  });

  it('invalidates an RSVP with the admin reason', async () => {
    const { fixture, service } = await render(true);

    await (fixture.componentInstance as any).invalidateRsvp(currentRow, 'Khách nhập sai');

    expect(service.calls).toContainEqual({
      method: 'setRsvpInvalidated', args: [21, true, 'Khách nhập sai'],
    });
  });

  it('renders a concise Check column and concise RSVP choices in raw lists', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      history: [
        { ...currentRow, id: 21, status: 'self_transport' },
        { ...currentRow, id: 22, status: 'cannot_attend' },
        { ...currentRow, id: 23, status: 'bus' },
      ],
    });
    component.selectTab('history');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const headers = Array.from(
      element.querySelectorAll('thead th'),
      header => header.textContent?.trim(),
    );
    const choices = Array.from(
      element.querySelectorAll('tbody tr'),
      row => row.children.item(3)?.textContent?.trim(),
    );
    const filterChoices = Array.from(
      element.querySelectorAll('select[aria-label="Lọc lựa chọn"] option'),
      option => option.textContent?.trim(),
    );

    expect(headers).toContain('Check');
    expect(headers).not.toContain('Data check');
    expect(element.querySelectorAll('.data-check-control span')).toHaveLength(0);
    expect(choices).toEqual(['Tự di chuyển', 'Không tham gia', 'Đi xe']);
    expect(filterChoices).toEqual([
      'Tất cả lựa chọn', 'Đi xe', 'Tự di chuyển', 'Không tham gia',
    ]);
  });

  it('marks a raw RSVP as checked through the admin RPC', async () => {
    const { fixture, service } = await render(true);

    await (fixture.componentInstance as any).toggleDataCheck(currentRow, true);

    expect(service.calls).toContainEqual({
      method: 'setRsvpDataCheck', args: [21, true],
    });
  });

  it('does not show the ineffective duplicate grouping control', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.selectTab('current');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.duplicate-sort')).toBeNull();
    expect(element.textContent).not.toContain('Gom dữ liệu trùng');
  });

  it('confirms or rejects a duplicate candidate through the review RPC', async () => {
    const { fixture, service } = await render(true);

    await (fixture.componentInstance as any).review(duplicate, 'confirmed');

    expect(service.calls).toContainEqual({
      method: 'reviewDuplicate', args: [20, 21, 'confirmed'],
    });
  });

  it('keeps reviewed duplicates visible so an admin can reopen the review', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      duplicates: [{
        ...duplicate,
        candidate_duplicate_status: 'rejected',
        candidate_duplicate_reviewed_at: '2026-08-02T11:00:00Z',
      }],
    });
    component.selectTab('duplicates');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.textContent).toContain('Đã xác nhận không trùng');
    expect(element.textContent).toContain('Đưa về chờ duyệt');
  });

  it('keeps superseded history read-only while current records remain editable', async () => {
    const { fixture } = await render(true);
    const component = fixture.componentInstance as any;
    component.dashboard.set({
      ...dashboard,
      history: [
        currentRow,
        { ...currentRow, id: 10, superseded_by_id: 21 },
      ],
    });
    component.selectTab('history');
    fixture.detectChanges();
    const editButtons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button.edit'),
    );

    expect(editButtons).toHaveLength(1);
  });
});
