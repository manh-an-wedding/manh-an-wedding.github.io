import { Component, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig, FaqItem } from '../../core/wedding-config';

@Component({
  selector: 'app-faq', standalone: true, imports: [TranslatePipe],
  template: `
    <section class="faq">
      <h2>{{ 'faq.title' | translate }}</h2>
      @for (item of items; track $index) {
        <div class="qa">
          <button type="button" (click)="toggle($index)">{{ item.qKey | translate }}</button>
          @if (openIndex === $index) {
            <div class="answer">
              <p>{{ item.aKey | translate }}</p>
              @if (item.showGiftQr) {
                <div class="gift">
                  <figure><img [src]="cfg.gift.bride.qr" alt="QR"><figcaption>
                    {{ cfg.gift.bride.name }} · {{ cfg.gift.bride.bank }} · {{ cfg.gift.bride.account }}</figcaption></figure>
                  <figure><img [src]="cfg.gift.groom.qr" alt="QR"><figcaption>
                    {{ cfg.gift.groom.name }} · {{ cfg.gift.groom.bank }} · {{ cfg.gift.groom.account }}</figcaption></figure>
                </div>
              }
            </div>
          }
        </div>
      }
    </section>`,
})
export class FaqComponent {
  items: FaqItem[];
  openIndex = -1;
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) { this.items = cfg.faq; }
  toggle(i: number) { this.openIndex = this.openIndex === i ? -1 : i; }
}
