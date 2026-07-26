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
      </a>
      <a [href]="icsHref()" download="wedding.ics">
        {{ 'map.ics' | translate }}
      </a>
    </section>`,
})
export class MapCalendarComponent {
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
      text: `${this.cfg.reception.name} — ${this.cfg.couple.groom} & ${this.cfg.couple.bride}`,
      dates: `${s}/${e}`, location: this.cfg.reception.address });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
  icsText(): string {
    const { s, e } = this.stamps();
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `SUMMARY:${this.cfg.reception.name}`, `DTSTART:${s}`, `DTEND:${e}`,
      `LOCATION:${this.cfg.reception.address}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  icsHref(): string { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(this.icsText()); }
}
