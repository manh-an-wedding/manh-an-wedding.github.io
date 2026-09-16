import { Component, HostListener, Inject } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig, FaqItem } from '../../core/wedding-config';

@Component({
  selector: 'app-faq', standalone: true, imports: [TranslatePipe],
  template: `
    <div class="section-separator faq-separator" aria-hidden="true"><span>♡</span></div>
    <section class="faq continuous-section">
      <h2 class="faq-title">{{ 'faq.title' | translate }}</h2>
      @for (item of items; track $index) {
        <div class="qa">
          <button type="button" (click)="toggle($index)"
                  [attr.aria-expanded]="openIndex === $index"
                  [attr.aria-controls]="'faq-answer-' + $index">
            {{ item.qKey | translate }}
          </button>
          @if (openIndex === $index) {
            <div class="answer" [id]="'faq-answer-' + $index">
              @if (item.aKey) {
                <p>{{ item.aKey | translate }}</p>
              }
              @if (item.items?.length) {
                <ul class="faq-answer-list">
                  @for (answerItem of item.items; track answerItem.textKey) {
                    <li>
                      <span>{{ answerItem.textKey | translate:answerItem.params }}</span>
                      @if (answerItem.href) {
                        <a class="faq-answer-link" [href]="answerItem.href"
                           target="_blank" rel="noopener noreferrer">
                          {{ (answerItem.linkLabelKey || 'faq.actions.details') | translate }}
                          <span aria-hidden="true">↗</span>
                        </a>
                      }
                    </li>
                  }
                </ul>
              }
              @if (item.sections?.length) {
                @for (section of item.sections; track section.headingKey) {
                  <div class="faq-answer-section">
                    <h4 class="faq-answer-heading">{{ section.headingKey | translate }}</h4>
                    @if (section.noteKey) {
                      <p class="faq-answer-note">{{ section.noteKey | translate }}</p>
                    }
                    <ul class="faq-answer-list">
                      @for (answerItem of section.items; track answerItem.textKey) {
                        <li>
                          <span>{{ answerItem.textKey | translate:answerItem.params }}</span>
                          @if (answerItem.href) {
                            <a class="faq-answer-link" [href]="answerItem.href"
                               target="_blank" rel="noopener noreferrer">
                              {{ (answerItem.linkLabelKey || 'faq.actions.details') | translate }}
                              <span aria-hidden="true">↗</span>
                            </a>
                          }
                          @if (answerItem.img) {
                            <figure class="faq-answer-figure">
                              <button type="button" class="faq-zoom-trigger"
                                      (click)="openZoom(answerItem.img)"
                                      [attr.aria-label]="'faq.actions.zoom' | translate">
                                <img [src]="answerItem.img" [alt]="answerItem.textKey | translate" loading="lazy">
                              </button>
                            </figure>
                          }
                        </li>
                      }
                    </ul>
                  </div>
                }
              }
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
    </section>
    @if (zoomedImg) {
      <div class="faq-lightbox" (click)="closeZoom()" role="dialog" aria-modal="true">
        <img [src]="zoomedImg" alt="" (click)="$event.stopPropagation()">
      </div>
    }`,
})
export class FaqComponent {
  items: FaqItem[];
  openIndex = -1;
  zoomedImg: string | null = null;
  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) { this.items = cfg.faq; }
  toggle(i: number) { this.openIndex = this.openIndex === i ? -1 : i; }
  openZoom(src: string) { this.zoomedImg = src; }
  closeZoom() { this.zoomedImg = null; }
  @HostListener('document:keydown.escape') onEscape() { this.closeZoom(); }
}
