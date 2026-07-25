import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  it('toggles a panel open/closed and marks the gift item', async () => {
    await TestBed.configureTestingModule({
      imports: [FaqComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();
    const c = TestBed.createComponent(FaqComponent).componentInstance;
    expect(c.openIndex).toBe(-1);
    c.toggle(0);
    expect(c.openIndex).toBe(0);
    c.toggle(0);
    expect(c.openIndex).toBe(-1);
    expect(c.items[0].showGiftQr).toBe(true); // first item is the gift question
  });
});
