import { TestBed } from '@angular/core/testing';
import { MapCalendarComponent } from './map-calendar.component';
import { provideTranslateService } from '@ngx-translate/core';

describe('MapCalendarComponent', () => {
  async function createComponent() {
    await TestBed.configureTestingModule({
      imports: [MapCalendarComponent], providers: [provideTranslateService({})] }).compileComponents();
    return TestBed.createComponent(MapCalendarComponent);
  }

  it('builds a reception calendar entry with the bride before the groom', async () => {
    const c = (await createComponent()).componentInstance;
    expect(c.googleCalUrl()).toContain('calendar.google.com');
    expect(c.googleCalUrl()).toContain('dates=');
    const calendar = new URL(c.googleCalUrl());
    expect(calendar.searchParams.get('text')).toBe('Tiệc cưới — Nhật An & Duy Mạnh');
    expect(calendar.searchParams.get('location'))
      .toBe('Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ');
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
    const appleIcon = fixture.nativeElement.querySelector('.apple-calendar-icon');
    expect(appleIcon).not.toBeNull();
    expect(appleIcon.getAttribute('fill')).toBe('currentColor');
    expect(appleIcon.getAttribute('stroke')).toBe('none');
    expect(appleIcon.querySelector('.apple-fruit')).not.toBeNull();
    expect(appleIcon.querySelector('.apple-leaf')).not.toBeNull();
  });

  it('offers 11:00–13:30 calendar entries and a Safari-compatible ICS file', async () => {
    const fixture = await createComponent();
    const c = fixture.componentInstance;
    const google = new URL(c.googleCalUrl());
    expect(google.searchParams.get('dates'))
      .toBe('20261017T040000Z/20261017T063000Z');

    fixture.detectChanges();
    const appleLink: HTMLAnchorElement =
      fixture.nativeElement.querySelectorAll('a')[2];
    expect(appleLink.getAttribute('href')).toBe('/assets/wedding.ics');
    expect(appleLink.hasAttribute('download')).toBe(false);
    expect(appleLink.getAttribute('href')).not.toContain('data:');
    expect(fixture.nativeElement.querySelector('iframe')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('a')).toHaveLength(3);
  });
});
