import { TestBed } from '@angular/core/testing';
import { MapCalendarComponent } from './map-calendar.component';
import { provideTranslateService } from '@ngx-translate/core';

describe('MapCalendarComponent', () => {
  it('builds a Google Calendar link and an ICS blob string', async () => {
    await TestBed.configureTestingModule({
      imports: [MapCalendarComponent], providers: [provideTranslateService({})] }).compileComponents();
    const c = TestBed.createComponent(MapCalendarComponent).componentInstance;
    expect(c.googleCalUrl()).toContain('calendar.google.com');
    expect(c.googleCalUrl()).toContain('dates=');
    const ics = c.icsText();
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
  });
});
