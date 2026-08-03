import { TestBed } from '@angular/core/testing';
import { HappinessRainComponent } from './happiness-rain.component';

describe('HappinessRainComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HappinessRainComponent],
    }).compileComponents();
  });

  it('renders the ordinary falling particles as colored confetti pieces', () => {
    const fixture = TestBed.createComponent(HappinessRainComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;

    const particles = Array.from(
      host.querySelectorAll<HTMLElement>('.confetti-particle'),
    );

    expect(particles).toHaveLength(22);
    expect(particles.every(particle => particle.textContent?.trim() === '')).toBe(true);
    expect(particles.every(particle => particle.style.backgroundColor !== '')).toBe(true);
    expect(particles.every(particle => particle.style.width !== '')).toBe(true);
    expect(particles.every(particle => particle.style.height !== '')).toBe(true);
  });

  it('never renders a secret happiness glyph after repeated confetti falls', () => {
    const fixture = TestBed.createComponent(HappinessRainComponent);
    fixture.detectChanges();
    const host = fixture.nativeElement as HTMLElement;
    const particle = host.querySelector<HTMLElement>('.confetti-particle');

    for (let fall = 0; fall < 80; fall += 1) {
      particle?.dispatchEvent(new Event('animationiteration'));
    }
    fixture.detectChanges();

    expect(host.querySelector('.happiness-secret')).toBeNull();
    expect(host.textContent).not.toContain('囍');
  });
});
