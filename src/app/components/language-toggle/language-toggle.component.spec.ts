import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { LanguageToggleComponent } from './language-toggle.component';

describe('LanguageToggleComponent (Option C)', () => {
  it('links vi→/en and en→/ (root is Vietnamese)', async () => {
    await TestBed.configureTestingModule({
      imports: [LanguageToggleComponent], providers: [provideRouter([])],
    }).compileComponents();
    const c = TestBed.createComponent(LanguageToggleComponent).componentInstance;
    c.current = 'vi';
    expect(c.otherLink).toBe('/en');
    expect(c.otherLabel).toBe('EN');
    c.current = 'en';
    expect(c.otherLink).toBe('/');
    expect(c.otherLabel).toBe('VI');
  });
});
