import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { combineLatest } from 'rxjs';
import { PublicBusAdminRsvp, PublicBusRsvp, RsvpService } from '../../core/rsvp.service';
import { buildXlsx, downloadXlsx } from '../../core/xlsx-writer';

type Pickup = 'hotel' | 'park' | null | undefined;

interface BusRow {
  rsvpId: number | null;
  guestName: string;
  category: string;
  phone: string | null;
  busPickup: Pickup;
  busReturn: boolean | null;
  checked: boolean;
  note: string | null;
  companions: string[];
}

interface BusGroup {
  category: string;
  rows: BusRow[];
  people: number;
  startIndex: number;
}

@Component({
  selector: 'app-bus-list',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './bus-list.component.html',
  styleUrl: '../public-group/public-group.component.scss',
})
export class BusListComponent implements OnInit {
  title = 'Danh sách đi xe';
  withPhone = false;
  rows: BusRow[] = [];
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly copiedPhoneFor = signal<number | null>(null);
  error = '';
  saveError = '';
  editingNoteFor: number | null = null;
  noteDraft = '';

  private token = '';

  get totalRiders(): number {
    return this.rows.reduce((sum, row) => sum + 1 + row.companions.length, 0);
  }

  get tanBinhRiders(): number {
    return this.pickupRiders('hotel');
  }

  get quan6Riders(): number {
    return this.pickupRiders('park');
  }

  get roundTripRiders(): number {
    return this.returnRiders(true);
  }

  get stayRiders(): number {
    return this.returnRiders(false);
  }

  get groups(): BusGroup[] {
    const byCategory = new Map<string, BusRow[]>();
    for (const row of this.rows) {
      const key = row.category || '—';
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(row);
      else byCategory.set(key, [row]);
    }
    let startIndex = 0;
    return [...byCategory.keys()]
      .sort((a, b) => a.localeCompare(b, 'vi'))
      .map(category => {
        const rows = byCategory.get(category)!;
        const people = rows.reduce((sum, row) => sum + 1 + row.companions.length, 0);
        const group: BusGroup = { category, rows, people, startIndex };
        startIndex += rows.length;
        return group;
      });
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly rsvp: RsvpService,
  ) {}

  ngOnInit(): void {
    combineLatest([this.route.data, this.route.queryParamMap]).subscribe(([data, query]) => {
      this.withPhone = data['withPhone'] === true;
      this.title = this.withPhone ? 'Danh sách đi xe (kèm SĐT)' : 'Danh sách đi xe';
      this.token = query.get('t')?.trim() ?? '';
      if (!this.token) {
        this.rows = [];
        this.loading.set(false);
        this.error = 'Liên kết xem danh sách không hợp lệ.';
        return;
      }
      void this.load(this.token);
    });
  }

  pickupLabel(pickup: Pickup): string {
    switch (pickup) {
      case 'hotel': return 'Ibis';
      case 'park': return 'CV Bình Phú';
      default: return '—';
    }
  }

  returnLabel(value: boolean | null | undefined): string {
    if (value === true) return 'Y';
    if (value === false) return 'N';
    return '—';
  }

  async toggleChecked(row: BusRow, checked: boolean): Promise<void> {
    if (!this.withPhone || row.rsvpId === null) return;
    const previous = row.checked;
    row.checked = checked;
    this.saving.set(true);
    this.saveError = '';
    try {
      await this.rsvp.setBusGuestMark(this.token, row.rsvpId, checked, row.note);
    } catch {
      row.checked = previous;
      this.saveError = 'Không thể lưu dấu kiểm. Vui lòng thử lại.';
    } finally {
      this.saving.set(false);
    }
  }

  dialable(phone: string): string {
    return phone.replace(/[^\d+]/g, '');
  }

  async copyPhone(row: BusRow): Promise<void> {
    if (!row.phone) return;
    try {
      await navigator.clipboard.writeText(row.phone);
      this.copiedPhoneFor.set(row.rsvpId);
      setTimeout(() => {
        if (this.copiedPhoneFor() === row.rsvpId) this.copiedPhoneFor.set(null);
      }, 1500);
    } catch {
      window.prompt('Copy số điện thoại:', row.phone);
    }
  }

  exportRows(): string[][] {
    const rows = [['Tên', 'Nhóm', 'SĐT', 'Ghi chú']];
    for (const group of this.groups) {
      for (const row of group.rows) {
        rows.push([row.guestName, row.category, row.phone ?? '', row.note ?? '']);
        const companionNote = row.note ? `Đi cùng ${row.guestName}; ${row.note}` : `Đi cùng ${row.guestName}`;
        for (const companion of row.companions) rows.push([companion, row.category, '', companionNote]);
      }
    }
    return rows;
  }

  exportExcel(): void {
    if (!this.withPhone) return;
    const now = new Date();
    const date = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
      .map(part => String(part).padStart(2, '0'))
      .join('-');
    const bytes = buildXlsx('Danh sách đi xe', this.exportRows(), { columnWidths: [28, 18, 16, 48] });
    downloadXlsx(`danh-sach-di-xe-${date}.xlsx`, bytes);
  }

  get checkedPeople(): number {
    return this.rows
      .filter(row => row.checked)
      .reduce((sum, row) => sum + 1 + row.companions.length, 0);
  }

  checkAll(): Promise<void> {
    return this.setAllChecked(true, 'Đánh dấu tất cả khách đã lên xe?');
  }

  uncheckAll(): Promise<void> {
    return this.setAllChecked(false, 'Bỏ dấu kiểm của tất cả khách? Ghi chú vẫn được giữ.');
  }

  private async setAllChecked(checked: boolean, question: string): Promise<void> {
    if (!this.withPhone || !window.confirm(question)) return;
    this.saving.set(true);
    this.saveError = '';
    try {
      await this.rsvp.setAllBusGuestChecks(this.token, checked);
      for (const row of this.rows) row.checked = checked;
    } catch {
      this.saveError = 'Không thể cập nhật dấu kiểm. Vui lòng thử lại.';
    } finally {
      this.saving.set(false);
    }
  }

  startNote(row: BusRow): void {
    if (!this.withPhone || row.rsvpId === null) return;
    this.editingNoteFor = row.rsvpId;
    this.noteDraft = row.note ?? '';
  }

  cancelNote(): void {
    this.editingNoteFor = null;
    this.noteDraft = '';
  }

  async saveNote(row: BusRow): Promise<void> {
    if (!this.withPhone || row.rsvpId === null) return;
    const next = this.noteDraft.trim() ? this.noteDraft.trim() : null;
    const previous = row.note;
    row.note = next;
    this.saving.set(true);
    this.saveError = '';
    try {
      await this.rsvp.setBusGuestMark(this.token, row.rsvpId, row.checked, next);
      this.editingNoteFor = null;
      this.noteDraft = '';
    } catch {
      row.note = previous;
      this.saveError = 'Không thể lưu ghi chú. Vui lòng thử lại.';
    } finally {
      this.saving.set(false);
    }
  }

  private pickupRiders(pickup: 'hotel' | 'park'): number {
    return this.rows
      .filter(row => row.busPickup === pickup)
      .reduce((sum, row) => sum + 1 + row.companions.length, 0);
  }

  private returnRiders(roundTrip: boolean): number {
    return this.rows
      .filter(row => row.busReturn === roundTrip)
      .reduce((sum, row) => sum + 1 + row.companions.length, 0);
  }

  private async load(token: string): Promise<void> {
    this.loading.set(true);
    this.error = '';
    this.editingNoteFor = null;
    try {
      this.rows = this.withPhone
        ? (await this.rsvp.getPublicBusAdminRsvps(token)).map(row => this.fromAdmin(row))
        : (await this.rsvp.getPublicBusRsvps(token)).map(row => this.fromPlain(row));
    } catch {
      this.rows = [];
      this.error = 'Liên kết xem danh sách không hợp lệ hoặc không còn hiệu lực.';
    } finally {
      this.loading.set(false);
    }
  }

  private fromAdmin(row: PublicBusAdminRsvp): BusRow {
    return {
      rsvpId: row.rsvp_id,
      guestName: row.guest_name,
      category: row.category,
      phone: row.phone ?? null,
      busPickup: row.bus_pickup,
      busReturn: row.bus_return ?? null,
      checked: row.checked === true,
      note: row.note ?? null,
      companions: row.companions ?? [],
    };
  }

  private fromPlain(row: PublicBusRsvp): BusRow {
    return {
      rsvpId: null,
      guestName: row.guest_name,
      category: row.category,
      phone: row.phone ?? null,
      busPickup: row.bus_pickup,
      busReturn: row.bus_return ?? null,
      checked: false,
      note: null,
      companions: row.companions ?? [],
    };
  }
}
