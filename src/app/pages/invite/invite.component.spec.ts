import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InviteComponent } from './invite.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { provideTranslateService } from '@ngx-translate/core';

class VisitStub { count = 0; log = async () => { this.count++; }; }

describe('InviteComponent', () => {
  let visit: VisitStub;
  beforeEach(async () => {
    visit = new VisitStub();
    await TestBed.configureTestingModule({
      imports: [InviteComponent],
      providers: [ provideRouter([]), provideTranslateService({}),
        { provide: VisitService, useValue: visit },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } } ],
    }).compileComponents();
  });

  it('logs a visit on init', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(visit.count).toBe(1);
  });

  it('reads lang from route data (defaults to vi)', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(f.componentInstance.lang).toBe('vi');
  });

  it('music starts off (no cover click to auto-start)', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.musicOn).toBe(false);
  });

  it('exposes section toggles (wishes + faq hidden by default)', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.cfg.sections.wishes).toBe(false);
    expect(c.cfg.sections.faq).toBe(false);
  });
});
