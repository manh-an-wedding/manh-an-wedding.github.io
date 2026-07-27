import { Component, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-map-calendar', standalone: true, imports: [TranslatePipe],
  template: `
    <section class="map-cal" aria-label="Các tùy chọn lịch và chỉ đường">
      <a [href]="cfg.reception.mapDirUrl" target="_blank" rel="noopener">
        {{ 'map.directions' | translate }}
        <svg class="directions-icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 21s7-6.15 7-12A7 7 0 1 0 5 9c0 5.85 7 12 7 12Z"></path>
          <circle cx="12" cy="9" r="2.5"></circle>
        </svg>
      </a>
      <a [href]="googleCalUrl()" target="_blank" rel="noopener">
        {{ 'map.gcal' | translate }}
        <svg class="calendar-icon google-calendar-icon" aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2"></rect>
          <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"></path>
          <path d="M8 13h2M14 13h2M8 17h2M14 17h2"></path>
        </svg>
      </a>
      <a [href]="appleCalendarUrl">
        {{ 'map.ics' | translate }}
        <svg class="apple-calendar-icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.26.07 2.14.69 2.88.73 1.1-.22 2.16-.85 3.34-.76 1.42.12 2.49.67 3.2 1.7-2.93 1.76-2.23 5.62.45 6.7-.54 1.42-1.24 2.83-1.87 4.6ZM12.03 7.25C11.88 5.14 13.6 3.4 15.57 3.23c.27 2.44-2.22 4.26-3.54 4.02Z"></path>
        </svg>
      </a>
    </section>`,
})
export class MapCalendarComponent {
  readonly appleCalendarUrl = '/assets/wedding.ics';

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}
  private stamps() {
    const start = new Date(this.cfg.reception.datetime);
    const end = new Date(start.getTime() + this.cfg.reception.calendarDurationHours * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return { s: fmt(start), e: fmt(end) };
  }
  googleCalUrl(): string {
    const { s, e } = this.stamps();
    const p = new URLSearchParams({ action: 'TEMPLATE',
      text: `${this.cfg.reception.name} — ${this.cfg.couple.bride} & ${this.cfg.couple.groom}`,
      dates: `${s}/${e}`, location: this.cfg.reception.address });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
}
