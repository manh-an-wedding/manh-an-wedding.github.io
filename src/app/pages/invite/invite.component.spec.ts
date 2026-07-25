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

  it('logs a visit on init and starts hidden (cover showing)', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(visit.count).toBe(1);
    expect(f.componentInstance.opened).toBe(false);
  });

  it('open() reveals content', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    c.open();
    expect(c.opened).toBe(true);
  });
});
