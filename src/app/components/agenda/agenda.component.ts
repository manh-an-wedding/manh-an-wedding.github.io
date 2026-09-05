import { Component, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig, AgendaItem } from '../../core/wedding-config';

@Component({
  selector: 'app-agenda', standalone: true, imports: [TranslatePipe],
  template: `
    <div class="section-separator agenda-separator" aria-hidden="true"><span>♡</span></div>
    <section class="agenda continuous-section">
      <h2 class="agenda-title">{{ 'agenda.title' | translate }}</h2>
      <ol class="agenda-list">
        @for (item of items; track item.time; let last = $last) {
          <li class="agenda-item" [class.agenda-item-last]="last">
            <span class="agenda-time">{{ item.time }}</span>
            <span class="agenda-marker" aria-hidden="true"></span>
            <div class="agenda-body">
              <h3 class="agenda-name">{{ item.titleKey | translate }}</h3>
              <ul class="agenda-points">
                @for (point of item.pointKeys; track point) {
                  <li>{{ point | translate }}</li>
                }
              </ul>
            </div>
          </li>
        }
      </ol>
    </section>`,
})
export class AgendaComponent {
  items: AgendaItem[];
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {
    this.items = cfg.event.agenda;
  }
}
