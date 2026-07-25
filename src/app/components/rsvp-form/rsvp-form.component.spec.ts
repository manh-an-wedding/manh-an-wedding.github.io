import { TestBed } from '@angular/core/testing';
import { RsvpFormComponent } from './rsvp-form.component';
import { RsvpService } from '../../core/rsvp.service';
import { GuestsService } from '../../core/guests.service';
import { DeviceIdService } from '../../core/device-id.service';
import { provideTranslateService } from '@ngx-translate/core';

class RsvpStub { clash = false; submitted: any = null;
  checkClash = async () => this.clash; submit = async (d: any) => { this.submitted = d; }; }
class GuestsStub { suggest = async () => ['Duy Mạnh']; }

describe('RsvpFormComponent', () => {
  let rsvp: RsvpStub;
  beforeEach(async () => {
    rsvp = new RsvpStub();
    await TestBed.configureTestingModule({
      imports: [RsvpFormComponent],
      providers: [
        provideTranslateService({}),
        { provide: RsvpService, useValue: rsvp },
        { provide: GuestsService, useValue: new GuestsStub() },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } },
      ],
    }).compileComponents();
  });

  it('requires name, group, and status before submit', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    expect(c.valid()).toBe(false);
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    expect(c.valid()).toBe(true);
  });

  it('requires phone when status is bus', () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    c.model.guestName = 'A'; c.model.category = 'IAS'; c.model.status = 'bus';
    expect(c.valid()).toBe(false);
    c.model.phone = '0900';
    expect(c.valid()).toBe(true);
  });

  it('shows clash popup instead of submitting when clash detected', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    rsvp.clash = true;
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    await c.trySubmit();
    expect(c.showClash).toBe(true);
    expect(rsvp.submitted).toBeNull();
  });

  it('confirming past the clash submits', async () => {
    const c = TestBed.createComponent(RsvpFormComponent).componentInstance;
    rsvp.clash = true;
    c.model.guestName = 'Duy Mạnh'; c.model.category = 'IAS'; c.model.status = 'self_transport';
    await c.trySubmit();
    await c.confirmDespiteClash();
    expect(rsvp.submitted?.guestName).toBe('Duy Mạnh');
  });
});
