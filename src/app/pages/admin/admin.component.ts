import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  AdminDashboard,
  AdminDuplicateRow,
  AdminRsvpUpdate,
  AdminRsvpRow,
  DuplicateReviewStatus,
  RsvpService,
  RsvpStatus,
} from '../../core/rsvp.service';

type AdminTab =
  | 'overview'
  | 'current'
  | 'history'
  | 'duplicates'
  | 'busCurrent'
  | 'busHistory';

interface EditDraft extends AdminRsvpUpdate {
  companions: { name: string; joinsBus: boolean; relation: string }[];
}

const PAGE_SIZE = 20;

const EMPTY_DASHBOARD: AdminDashboard = {
  summary: {
    rawRsvpCount: 0,
    currentRsvpCount: 0,
    attendingPeople: 0,
    pendingDuplicateCount: 0,
    busGuestSeats: 0,
    busCompanionSeats: 0,
  },
  current: [],
  history: [],
  duplicates: [],
  busCurrent: [],
  busHistory: [],
  groups: [],
};

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.scss',
})
export class AdminComponent implements OnInit {
  email = '';
  password = '';
  readonly authenticated = signal<boolean | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly dashboard = signal<AdminDashboard>(EMPTY_DASHBOARD);
  readonly tab = signal<AdminTab>('overview');
  readonly search = signal('');
  readonly groupFilter = signal('');
  readonly statusFilter = signal('');
  readonly page = signal(1);
  readonly pageSize = PAGE_SIZE;
  editDraft: EditDraft | null = null;

  readonly visibleRows = computed(() => {
    const data = this.dashboard();
    const rows = this.rowsForTab(data, this.tab());
    const query = this.search().trim().toLocaleLowerCase('vi');
    const group = this.groupFilter();
    const status = this.statusFilter();
    const filtered = rows.filter(row => {
      const haystack = [
        row.guest_name,
        row.category,
        row.phone ?? '',
        ...row.companions.map(companion => companion.name),
      ].join(' ').toLocaleLowerCase('vi');
      return (!query || haystack.includes(query))
        && (!group || row.category === group)
        && (!status || row.status === status);
    });
    return filtered;
  });

  readonly pagedRows = computed(() => this.slicePage(this.visibleRows()));
  readonly pagedDuplicates = computed(() => this.slicePage(this.dashboard().duplicates));
  readonly pageCount = computed(() => {
    const count = this.tab() === 'duplicates'
      ? this.dashboard().duplicates.length
      : this.visibleRows().length;
    return Math.max(1, Math.ceil(count / this.pageSize));
  });

  constructor(private readonly rsvp: RsvpService) {}

  async ngOnInit(): Promise<void> {
    try {
      const hasSession = await this.rsvp.hasAdminSession();
      this.authenticated.set(hasSession);
      if (hasSession) await this.loadDashboard();
    } catch {
      this.authenticated.set(false);
      this.error.set('Không thể kiểm tra phiên đăng nhập. Vui lòng thử lại.');
    }
  }

  async login(): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.rsvp.signInAdmin(this.email.trim(), this.password);
      this.authenticated.set(true);
      this.password = '';
      await this.loadDashboard();
    } catch (error) {
      this.authenticated.set(false);
      this.error.set(this.errorMessage(error, 'Đăng nhập không thành công.'));
    } finally {
      this.busy.set(false);
    }
  }

  async logout(): Promise<void> {
    await this.rsvp.signOutAdmin();
    this.authenticated.set(false);
    this.dashboard.set(EMPTY_DASHBOARD);
  }

  selectTab(tab: AdminTab): void {
    this.tab.set(tab);
    this.page.set(1);
    this.editDraft = null;
  }

  setSearch(value: string): void {
    this.search.set(value);
    this.page.set(1);
  }

  setGroupFilter(value: string): void {
    this.groupFilter.set(value);
    this.page.set(1);
  }

  setStatusFilter(value: string): void {
    this.statusFilter.set(value);
    this.page.set(1);
  }

  goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
  }

  startEdit(row: AdminRsvpRow): void {
    this.editDraft = {
      sourceId: row.id,
      guestName: row.guest_name,
      category: row.category,
      status: row.status,
      phone: row.phone ?? '',
      companions: row.companions.map(companion => ({
        name: companion.name,
        joinsBus: companion.joins_bus,
        relation: companion.relation ?? '',
      })),
    };
  }

  addEditCompanion(): void {
    this.editDraft?.companions.push({ name: '', joinsBus: false, relation: '' });
  }

  removeEditCompanion(index: number): void {
    this.editDraft?.companions.splice(index, 1);
  }

  async saveEdit(): Promise<void> {
    if (!this.editDraft) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const draft = this.editDraft;
      await this.rsvp.updateAdminRsvp({
        ...draft,
        companions: draft.companions.map(companion => ({
          name: companion.name,
          joinsBus: draft.status === 'bus',
          relation: companion.relation,
        })),
      });
      this.editDraft = null;
      await this.loadDashboard();
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Không thể lưu chỉnh sửa.'));
    } finally {
      this.busy.set(false);
    }
  }

  async toggleDataCheck(row: AdminRsvpRow, checked: boolean): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.rsvp.setRsvpDataCheck(row.id, checked);
      await this.loadDashboard();
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Không thể cập nhật trạng thái kiểm tra.'));
    } finally {
      this.busy.set(false);
    }
  }

  isRawTab(tab = this.tab()): boolean {
    return tab === 'history' || tab === 'busHistory';
  }

  rowState(row: AdminRsvpRow):
    'new' | 'superseded' | 'duplicate' | 'reviewed-unique' | 'reviewed-duplicate' {
    if (row.duplicate_status === 'confirmed') return 'reviewed-duplicate';
    if (row.duplicate_status === 'rejected') return 'reviewed-unique';
    if (row.duplicate_of_id !== null && row.duplicate_of_id > 0) return 'duplicate';
    if (row.superseded_by_id !== null) return 'superseded';
    return 'new';
  }

  rowStateLabel(row: AdminRsvpRow): string {
    switch (this.rowState(row)) {
      case 'superseded': return 'Đã thay đổi';
      case 'duplicate': return 'Trùng';
      case 'reviewed-unique': return 'Đã xử lý (không trùng)';
      case 'reviewed-duplicate': return 'Đã xử lý (bị trùng)';
      case 'new': return 'Mới';
    }
  }

  async review(
    duplicate: AdminDuplicateRow,
    status: DuplicateReviewStatus,
  ): Promise<void> {
    this.busy.set(true);
    this.error.set('');
    try {
      await this.rsvp.reviewDuplicate(
        duplicate.candidate_id,
        duplicate.target_id,
        status,
      );
      await this.loadDashboard();
    } catch (error) {
      this.error.set(this.errorMessage(error, 'Không thể cập nhật đánh giá trùng.'));
    } finally {
      this.busy.set(false);
    }
  }

  statusLabel(status: RsvpStatus): string {
    switch (status) {
      case 'bus': return 'Đi xe';
      case 'self_transport': return 'Tự di chuyển';
      case 'cannot_attend': return 'Không tham gia';
    }
  }

  downloadCsv(): void {
    const csv = this.buildCsv(this.visibleRows());
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rsvp-${this.tab()}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private async loadDashboard(): Promise<void> {
    this.dashboard.set(await this.rsvp.getAdminDashboard());
    this.goToPage(this.page());
  }

  private rowsForTab(data: AdminDashboard, tab: AdminTab): AdminRsvpRow[] {
    switch (tab) {
      case 'history': return data.history;
      case 'busCurrent': return data.busCurrent;
      case 'busHistory': return data.busHistory;
      case 'overview':
      case 'current': return data.current;
      case 'duplicates': return [];
    }
  }

  private slicePage<T>(rows: T[]): T[] {
    const start = (this.page() - 1) * this.pageSize;
    return rows.slice(start, start + this.pageSize);
  }

  private buildCsv(rows: AdminRsvpRow[]): string {
    const fields = [
      'ID', 'Tên khách', 'Nhóm', 'Lựa chọn', 'SĐT', 'Số người',
      'Người đi cùng', 'Thiết bị', 'IP', 'Thời gian',
    ];
    const lines = rows.map(row => [
      row.id,
      row.guest_name,
      row.category,
      this.statusLabel(row.status),
      row.phone ?? '',
      row.party_size,
      row.companions.map(companion => companion.name).join('; '),
      row.device_id ?? '',
      row.ip ?? '',
      row.created_at,
    ].map(value => this.csvCell(String(value))).join(','));
    return [fields.map(field => this.csvCell(field)).join(','), ...lines].join('\r\n');
  }

  private csvCell(value: string): string {
    return `"${value.replaceAll('"', '""')}"`;
  }

  private errorMessage(error: unknown, fallback: string): string {
    return error instanceof Error && error.message ? error.message : fallback;
  }
}
