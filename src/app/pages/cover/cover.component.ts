import { Component, EventEmitter, Output, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';

@Component({
  selector: 'app-cover', standalone: true, imports: [TranslatePipe],
  template: `
    <section class="cover">
      <h1>{{ cfg.couple.bride }} &amp; {{ cfg.couple.groom }}</h1>
      <button (click)="opened.emit()">{{ 'cover.open' | translate }}</button>
    </section>`,
  styles: [`.cover{min-height:100vh;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;gap:2rem}`],
})
export class CoverComponent {
  @Output() opened = new EventEmitter<void>();
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}
}
