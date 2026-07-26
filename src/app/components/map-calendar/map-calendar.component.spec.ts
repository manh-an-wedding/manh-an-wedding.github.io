import { TestBed } from '@angular/core/testing';
import { MapCalendarComponent } from './map-calendar.component';
import { provideTranslateService } from '@ngx-translate/core';

describe('MapCalendarComponent', () => {
  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [MapCalendarComponent], providers: [provideTranslateService({})] }).compileComponents();
    return TestBed.createComponent(MapCalendarComponent);
  }

  it('builds a reception calendar entry with the groom before the bride', async () => {
    const c = (await createComponent()).componentInstance;
    expect(c.googleCalUrl()).toContain('calendar.google.com');
    expect(c.googleCalUrl()).toContain('dates=');
    const calendar = new URL(c.googleCalUrl());
    expect(calendar.searchParams.get('text')).toBe('Tiệc cưới — Duy Mạnh & Nhật An');
    expect(calendar.searchParams.get('location'))
      .toBe('Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ');
    const ics = c.icsText();
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });

  it('uses the supplied Vạn Phát Riverside directions link', async () => {
    const fixture = await createComponent();
    fixture.detectChanges();
    const directions = fixture.nativeElement.querySelector('a') as HTMLAnchorElement;
    expect(directions.getAttribute('href'))
      .toBe('https://maps.app.goo.gl/of7FJD3HC6WWPuv7A');
    expect(directions.querySelector('.directions-icon')).not.toBeNull();
  });

  it('shows the matching icon on each calendar action', async () => {
    const fixture = await createComponent();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.google-calendar-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.apple-calendar-icon')).not.toBeNull();
  });

  it('offers 11:00–13:30 calendar entries without an embedded map', async () => {
    const fixture = await createComponent();
    const c = fixture.componentInstance;
    const google = new URL(c.googleCalUrl());
    expect(google.searchParams.get('dates'))
      .toBe('20261017T040000Z/20261017T063000Z');
    expect(c.icsText()).toContain('DTSTART:20261017T040000Z');
    expect(c.icsText()).toContain('DTEND:20261017T063000Z');

    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(3);
  });
});
