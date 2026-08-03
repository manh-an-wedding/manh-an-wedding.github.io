import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  inject,
  Input,
  ViewChild,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import {
  RsvpService,
  RsvpDraft,
  RsvpEditHandle,
  CompanionDraft,
} from '../../core/rsvp.service';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';
import { CompanionsEditorComponent } from '../companions-editor/companions-editor.component';

@Component({
  selector: 'app-rsvp-form', standalone: true,
  imports: [FormsModule, NgTemplateOutlet, TranslatePipe, CompanionsEditorComponent],
  templateUrl: './rsvp-form.component.html',
})
export class RsvpFormComponent {
  readonly busPickupMapUrl = 'https://maps.app.goo.gl/A4G9MXVdHavg2cTq6';
  readonly maxPartySize = 10;

  private rsvp = inject(RsvpService);
  private cdr = inject(ChangeDetectorRef);
  @ViewChild('busInfoHintButton') private busInfoHintButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('busInfoPanel') private busInfoPanel?: ElementRef<HTMLElement>;
  @ViewChild('confirmationPanel') private confirmationPanel?: ElementRef<HTMLElement>;
  @ViewChild('guestNameInput') private guestNameInput?: ElementRef<HTMLInputElement>;
  @ViewChild('submitError') private submitError?: ElementRef<HTMLElement>;
  @Input() lang: 'vi' | 'en' = 'vi';

  model: { guestName: string; category: string;
           status: '' | 'self_transport' | 'bus' | 'cannot_attend'; phone: string } =
    { guestName: '', category: '', status: '', phone: '' };
  companions: CompanionDraft[] = [];
  showBusInfo = false;
  done = false;
  submitting = false;
  submitFailed = false;
  private editHandle: RsvpEditHandle | null = null;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  get deadlinePassed(): boolean { return new Date() > new Date(this.cfg.rsvp.deadlineISO); }
  get busPartySize(): number { return 1 + this.companions.length; }
  get formattedBusPartySize(): string {
    return String(this.busPartySize).padStart(2, '0');
  }
  get hasFullTable(): boolean { return this.busPartySize === this.maxPartySize; }

  onStatusChange(status: '' | 'self_transport' | 'bus' | 'cannot_attend') {
    if (status !== 'bus') this.showBusInfo = false;
  }

  toggleBusInfo(returnTarget = this.busInfoHintButton?.nativeElement) {
    this.showBusInfo = !this.showBusInfo;
    this.cdr.detectChanges();
    const target = this.showBusInfo
      ? this.busInfoPanel?.nativeElement
      : returnTarget;
    this.focusAndCenter(target);
  }

  valid(): boolean {
    if (!this.model.guestName.trim() || !this.model.category || !this.model.status) return false;
    if (this.model.status === 'bus' && !this.model.phone.trim()) return false;
    if (this.model.status === 'bus' && this.deadlinePassed) return false;
    return true;
  }

  private draft(): RsvpDraft {
    return { guestName: this.model.guestName, category: this.model.category,
      status: this.model.status as any, phone: this.model.phone,
      companions: this.companions.map(companion => ({
        name: companion.name,
        joinsBus: this.model.status === 'bus',
        ...(companion.relation ? { relation: companion.relation } : {}),
      })),
    };
  }

  async trySubmit() {
    if (!this.valid() || this.submitting) return;
    this.submitting = true;
    this.submitFailed = false;
    try {
      const draft = this.draft();
      if (this.editHandle) {
        await this.rsvp.update(this.editHandle, draft);
      } else {
        this.editHandle = await this.rsvp.submit(draft);
      }
      this.done = true;
    } catch (error) {
      console.error('RSVP submission failed', error);
      if (this.editHandle && this.isUnauthorizedEdit(error)) {
        this.editHandle = null;
      }
      this.submitFailed = true;
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
      if (this.done) {
        this.focusAndCenter(this.confirmationPanel?.nativeElement);
      } else if (this.submitFailed) {
        this.focusAndCenter(this.submitError?.nativeElement);
      }
    }
  }

  editResponse() {
    this.done = false;
    this.submitFailed = false;
    this.cdr.detectChanges();
    this.focusAndCenter(this.guestNameInput?.nativeElement);
  }

  private focusAndCenter(target?: HTMLElement) {
    if (!target) return;

    target.focus({ preventScroll: true });
    const view = target.ownerDocument.defaultView;
    const centerTarget = () => {
      if (typeof target.scrollIntoView !== 'function') return;
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    };

    if (view?.requestAnimationFrame) {
      view.requestAnimationFrame(centerTarget);
    } else {
      centerTarget();
    }
  }

  private isUnauthorizedEdit(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) return false;
    const detail = error as { code?: unknown; message?: unknown };
    return detail.code === '42501'
      || detail.message === 'RSVP edit is not authorized';
  }
}
