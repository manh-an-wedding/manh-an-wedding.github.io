import { Component } from '@angular/core';

interface HappinessParticle {
  id: number;
  left: number;
  delay: number;
  duration: number;
  size: number;
  drift: number;
}

@Component({
  selector: 'app-happiness-rain',
  standalone: true,
  template: `
    <div class="happiness-rain" aria-hidden="true">
      @for (particle of particles; track particle.id) {
        <span
          [style.left.%]="particle.left"
          [style.font-size.rem]="particle.size"
          [style.animation-delay.s]="particle.delay"
          [style.animation-duration.s]="particle.duration"
          [style.--drift]="particle.drift + 'px'"
          [style.--drift-back]="particle.drift * -0.45 + 'px'"
          (animationiteration)="recordFall()">囍</span>
      }
      @if (secretVisible) {
        <div class="happiness-secret-lane">
          <span
            class="happiness-secret"
            [style.left.%]="secretLeft"
            [style.font-size.rem]="secretSize"
            [style.--drift]="secretDrift + 'px'"
            [style.--drift-back]="secretDrift * -0.45 + 'px'"
            (animationend)="finishSecretFall()">囍</span>
        </div>
      }
    </div>
  `,
})
export class HappinessRainComponent {
  readonly particles: readonly HappinessParticle[] = this.createParticles(22);
  readonly secretEveryFalls = 40;
  readonly secretSize = this.round(Math.max(...this.particles.map(particle => particle.size)) * 5);
  secretLeft = 50;
  secretDrift = 0;
  completedFalls = 0;
  secretVisible = false;

  recordFall() {
    this.completedFalls += 1;

    if (!this.secretVisible && this.completedFalls >= this.secretEveryFalls) {
      this.completedFalls = 0;
      this.randomizeSecretPath();
      this.secretVisible = true;
    }
  }

  finishSecretFall() {
    this.secretVisible = false;
  }

  randomizeSecretPath() {
    this.secretLeft = this.round(8 + Math.random() * 84);
    this.secretDrift = Math.round(
      (16 + Math.random() * 22) * (Math.random() < .5 ? -1 : 1),
    );
  }

  private createParticles(count: number): HappinessParticle[] {
    const horizontalSegment = 100 / count;
    const delayWindow = 19;

    return Array.from({ length: count }, (_, id) => {
      const phaseIndex = (id * 11) % count;
      const phaseJitter = (Math.random() - .5) * .55;
      const driftDirection = Math.random() < .5 ? -1 : 1;

      return {
        id,
        left: this.round((id + .18 + Math.random() * .64) * horizontalSegment),
        delay: -this.round(Math.max(0, phaseIndex * delayWindow / count + phaseJitter)),
        duration: this.round(10 + Math.random() * 9),
        size: this.round(.62 + Math.random() * .58),
        drift: Math.round((12 + Math.random() * 26) * driftDirection),
      };
    });
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
