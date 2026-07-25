import { Component, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-map-calendar', standalone: true, imports: [TranslatePipe],
  template: `
    <section class="map-cal">
      <iframe [src]="safeMap" width="100%" height="260" style="border:0" loading="lazy"></iframe>
      <a [href]="cfg.event.mapDirUrl" target="_blank" rel="noopener">Chỉ đường</a>
      <a [href]="googleCalUrl()" target="_blank" rel="noopener">Google Calendar</a>
      <a [href]="icsHref()" download="wedding.ics">Apple / .ics</a>
    </section>`,
})
export class MapCalendarComponent {
  safeMap: SafeResourceUrl;
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig, san: DomSanitizer) {
    this.safeMap = san.bypassSecurityTrustResourceUrl(cfg.event.mapEmbedUrl);
  }
  private stamps() {
    const start = new Date(this.cfg.event.datetime);
    const end = new Date(start.getTime() + 3 * 3600 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    return { s: fmt(start), e: fmt(end) };
  }
  googleCalUrl(): string {
    const { s, e } = this.stamps();
    const p = new URLSearchParams({ action: 'TEMPLATE',
      text: `${this.cfg.event.name} — ${this.cfg.couple.bride} & ${this.cfg.couple.groom}`,
      dates: `${s}/${e}`, location: this.cfg.event.address });
    return `https://calendar.google.com/calendar/render?${p.toString()}`;
  }
  icsText(): string {
    const { s, e } = this.stamps();
    return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'BEGIN:VEVENT',
      `SUMMARY:${this.cfg.event.name}`, `DTSTART:${s}`, `DTEND:${e}`,
      `LOCATION:${this.cfg.event.address}`, 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  }
  icsHref(): string { return 'data:text/calendar;charset=utf-8,' + encodeURIComponent(this.icsText()); }
}
