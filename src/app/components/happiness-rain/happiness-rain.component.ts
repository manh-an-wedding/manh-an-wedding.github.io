import { Component } from '@angular/core';

interface HappinessParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  width: number;
  color: string;
  radius: number;
  drift: number;
  tilt: number;
  spin: number;
}

@Component({
  selector: 'app-happiness-rain',
  standalone: true,
  template: `
    <div class="happiness-rain" aria-hidden="true">
      @for (particle of particles; track particle.id) {
        <span
          class="confetti-particle"
          [style.left.%]="particle.left"
          [style.width.rem]="particle.width"
          [style.height.rem]="particle.size"
          [style.background-color]="particle.color"
          [style.border-radius.px]="particle.radius"
          [style.animation-delay.s]="particle.delay"
          [style.animation-duration.s]="particle.duration"
          [style.--drift]="particle.drift + 'px'"
          [style.--drift-back]="particle.drift * -0.45 + 'px'"
          [style.--tilt]="particle.tilt + 'deg'"
          [style.--spin-mid]="particle.spin * .5 + 'deg'"
          [style.--spin-end]="particle.spin + 'deg'"></span>
      }
    </div>
  `,
})
export class HappinessRainComponent {
  private readonly confettiPalette = ['#a8191d', '#c9952e', '#efb7b5', '#f4e6cf'] as const;
  readonly particles: readonly HappinessParticle[] = this.createParticles(22);

  private createParticles(count: number): HappinessParticle[] {
    const horizontalSegment = 100 / count;
    const delayWindow = 19;

    return Array.from({ length: count }, (_, id) => {
      const phaseIndex = (id * 11) % count;
      const phaseJitter = (Math.random() - .5) * .55;
      const driftDirection = Math.random() < .5 ? -1 : 1;
      const spinDirection = Math.random() < .5 ? -1 : 1;

      return {
        id,
        left: this.round((id + .18 + Math.random() * .64) * horizontalSegment),
        delay: -this.round(Math.max(0, phaseIndex * delayWindow / count + phaseJitter)),
        duration: this.round(10 + Math.random() * 9),
        size: this.round(.62 + Math.random() * .58),
        width: this.round(.18 + Math.random() * .18),
        color: this.confettiPalette[id % this.confettiPalette.length],
        radius: id % 4 === 0 ? 3 : 1,
        drift: Math.round((12 + Math.random() * 26) * driftDirection),
        tilt: Math.round(-28 + Math.random() * 56),
        spin: Math.round((260 + Math.random() * 360) * spinDirection),
      };
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
