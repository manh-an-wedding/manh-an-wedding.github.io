import { TestBed } from '@angular/core/testing';
import { provideTranslateService } from '@ngx-translate/core';
import { FaqComponent } from './faq.component';

describe('FaqComponent', () => {
  it('toggles a panel open/closed while gift QR stays disabled until configured', async () => {
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
    expect(c.items[0].showGiftQr).toBe(false);
  });

  it('renders structured recommendations with safe external links', async () => {
    await TestBed.configureTestingModule({
      imports: [FaqComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();

    const fixture = TestBed.createComponent(FaqComponent);
    fixture.detectChanges();
    const buttons = fixture.nativeElement.querySelectorAll('.qa > button');
    const activitiesIndex = fixture.componentInstance.items.findIndex(
      item => item.qKey === 'faq.activities.q',
    );
    (buttons[activitiesIndex] as HTMLButtonElement).click();
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('.faq-answer-list');
    const links = Array.from(
      fixture.nativeElement.querySelectorAll('.faq-answer-link'),
    ) as HTMLAnchorElement[];

    expect(list).not.toBeNull();
    expect(links.length).toBe(2);
    expect(links[0].href).toBe('https://mykhanh.com/tat-muong-bat-ca-ms010');
    expect(links[0].target).toBe('_blank');
    expect(links[0].rel).toContain('noopener');
  });

  it('renders as a continuous invitation section instead of a raised card', async () => {
    await TestBed.configureTestingModule({
      imports: [FaqComponent],
      providers: [provideTranslateService({})],
    }).compileComponents();

    const fixture = TestBed.createComponent(FaqComponent);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('section.faq');
    const separator = fixture.nativeElement.querySelector('.faq-separator');
    expect(separator?.textContent.trim()).toBe('♡');
    expect(section?.classList.contains('continuous-section')).toBe(true);
    expect(section?.querySelector('h2')?.classList.contains('faq-title')).toBe(true);
  });
});
