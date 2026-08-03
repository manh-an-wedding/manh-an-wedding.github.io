import { Component, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-map-calendar', standalone: true, imports: [TranslatePipe],
  template: `
    <section class="map-cal" aria-label="Các tùy chọn lịch và chỉ đường">
      <a class="reveal-step" [href]="cfg.reception.mapDirUrl" target="_blank" rel="noopener">
        {{ 'map.directions' | translate }}
        <svg class="directions-icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M12 21s7-6.15 7-12A7 7 0 1 0 5 9c0 5.85 7 12 7 12Z"></path>
          <circle cx="12" cy="9" r="2.5"></circle>
        </svg>
      </a>
      <a class="reveal-step" style="--reveal-delay: .15s"
         [href]="googleCalUrl()" target="_blank" rel="noopener">
        {{ 'map.gcal' | translate }}
        <svg class="calendar-icon google-calendar-icon" aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3.5" y="5" width="17" height="15.5" rx="2"></rect>
          <path d="M7.5 3v4M16.5 3v4M3.5 9.5h17"></path>
          <path d="M8 13h2M14 13h2M8 17h2M14 17h2"></path>
        </svg>
      </a>
      <a class="reveal-step" style="--reveal-delay: .3s" [href]="appleCalendarUrl">
        {{ 'map.ics' | translate }}
        <svg class="apple-calendar-icon" aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="currentColor" stroke="none">
          <path class="apple-fruit" d="M12 7.2c-1.4-1.2-3.5-1.8-5.2-.7C4.8 7.7 4 10.3 4.5 13c.7 3.7 3.2 7.5 5.2 7.5.9 0 1.5-.5 2.3-.5s1.4.5 2.3.5c2 0 4.5-3.8 5.2-7.5.5-2.7-.3-5.3-2.3-6.5-1.7-1.1-3.8-.5-5.2.7Z"></path>
          <path class="apple-leaf" d="M12.2 6.3c.2-2.2 1.6-3.7 3.8-3.8-.1 2.2-1.6 3.7-3.8 3.8Z"></path>
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
