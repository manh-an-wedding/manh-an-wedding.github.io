import { ChangeDetectorRef, Component, Inject, inject, Input } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { RsvpService, RsvpDraft, CompanionDraft } from '../../core/rsvp.service';
import { GuestsService } from '../../core/guests.service';
import { DeviceIdService } from '../../core/device-id.service';
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
  private guests = inject(GuestsService);
  private device = inject(DeviceIdService);
  private cdr = inject(ChangeDetectorRef);
  @Input() lang: 'vi' | 'en' = 'vi';

  model: { guestName: string; category: string;
           status: '' | 'self_transport' | 'bus' | 'cannot_attend'; phone: string } =
    { guestName: '', category: '', status: '', phone: '' };
  companions: CompanionDraft[] = [];
  suggestions: string[] = [];
  showBusInfo = false;
  done = false;
  submitting = false;
  submitFailed = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  get deadlinePassed(): boolean { return new Date() > new Date(this.cfg.rsvp.deadlineISO); }
  get busPartySize(): number { return 1 + this.companions.length; }
  get formattedBusPartySize(): string {
    return String(this.busPartySize).padStart(2, '0');
  }
  get hasFullTable(): boolean { return this.busPartySize === this.maxPartySize; }

  async onNameInput() { this.suggestions = await this.guests.suggest(this.model.guestName); }

  onStatusChange(status: '' | 'self_transport' | 'bus' | 'cannot_attend') {
    if (status !== 'bus') this.showBusInfo = false;
  }

  valid(): boolean {
    if (!this.model.guestName.trim() || !this.model.category || !this.model.status) return false;
    if (this.model.status === 'bus' && !this.model.phone.trim()) return false;
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
      deviceId: this.device.get() };
  }

  async trySubmit() {
    if (!this.valid() || this.submitting) return;
    this.submitting = true;
    this.submitFailed = false;
    try {
      await this.rsvp.submit(this.draft());
      this.done = true;
    } catch (error) {
      console.error('RSVP submission failed', error);
      this.submitFailed = true;
    } finally {
      this.submitting = false;
      this.cdr.detectChanges();
    }
  }

  editResponse() {
    this.done = false;
    this.submitFailed = false;
  }
}
