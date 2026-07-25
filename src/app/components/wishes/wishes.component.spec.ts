import { TestBed } from '@angular/core/testing';
import { WishesComponent } from './wishes.component';
import { WishesService } from '../../core/wishes.service';
import { DeviceIdService } from '../../core/device-id.service';
import { provideTranslateService } from '@ngx-translate/core';

class WishesStub { added: any = null; list = [{ id: 1, name: 'X', message: 'hi' }];
  add = async (w: any) => { this.added = w; };
  listPublic = async () => this.list; }

describe('WishesComponent', () => {
  let stub: WishesStub;
  beforeEach(async () => {
    stub = new WishesStub();
    await TestBed.configureTestingModule({
      imports: [WishesComponent],
      providers: [
        provideTranslateService({}),
        { provide: WishesService, useValue: stub },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } },
      ],
    }).compileComponents();
  });

  it('loads public wishes on init', async () => {
    const f = TestBed.createComponent(WishesComponent);
    await f.componentInstance.ngOnInit();
    expect(f.componentInstance.wall.length).toBe(1);
  });

  it('submits a wish then reloads the wall', async () => {
    const c = TestBed.createComponent(WishesComponent).componentInstance;
    c.name = 'Me'; c.message = 'Chúc mừng'; c.isPublic = true;
    await c.send();
    expect(stub.added).toEqual({ name: 'Me', message: 'Chúc mừng', isPublic: true, deviceId: 'dev-1' });
  });
});
