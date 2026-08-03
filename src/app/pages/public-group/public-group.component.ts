import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  PublicGroupRsvp,
  RsvpService,
  RsvpStatus,
} from '../../core/rsvp.service';

const GROUP_TITLES: Record<string, string> = {
  'tien-buoc': 'Danh sách nhóm Tiến bước',
};

const GROUP_SLUG_ALIASES: Record<string, string> = {
  'tienbuoc.index.html': 'tien-buoc',
};

@Component({
  selector: 'app-public-group',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './public-group.component.html',
  styleUrl: './public-group.component.scss',
})
export class PublicGroupComponent implements OnInit {
  title = 'Danh sách xác nhận tham dự';
  rows: PublicGroupRsvp[] = [];
  readonly page = signal(1);
  readonly pageSize = 20;
  readonly loading = signal(true);
  error = '';

  get pageCount(): number {
    return Math.max(1, Math.ceil(this.rows.length / this.pageSize));
  }

  get pagedRows(): PublicGroupRsvp[] {
    const start = (this.page() - 1) * this.pageSize;
    return this.rows.slice(start, start + this.pageSize);
  }

  constructor(
    private readonly route: ActivatedRoute,
    private readonly rsvp: RsvpService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const requestedSlug = params.get('slug') ?? '';
      const slug = GROUP_SLUG_ALIASES[requestedSlug] ?? requestedSlug;
      this.title = GROUP_TITLES[slug] ?? this.title;
      void this.load(slug);
    });
  }

  statusLabel(status: RsvpStatus): string {
    switch (status) {
      case 'bus':
        return 'Đi xe';
      case 'self_transport':
        return 'Tự di chuyển';
      case 'cannot_attend':
        return 'Không tham gia';
    }
  }

  goToPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount)));
  }

  private async load(slug: string): Promise<void> {
    this.loading.set(true);
    this.error = '';
    try {
      this.rows = await this.rsvp.getPublicGroupRsvps(slug);
      this.page.set(1);
    } catch {
      this.error = 'Không thể tải danh sách. Bác vui lòng thử lại sau.';
    } finally {
      this.loading.set(false);
    }
  }
}
