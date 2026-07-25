import { Component, Inject, inject, Input } from '@angular/core';
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
  imports: [FormsModule, TranslatePipe, CompanionsEditorComponent],
  templateUrl: './rsvp-form.component.html',
})
export class RsvpFormComponent {
  private rsvp = inject(RsvpService);
  private guests = inject(GuestsService);
  private device = inject(DeviceIdService);
  @Input() lang: 'vi' | 'en' = 'vi';

  model: { guestName: string; category: string;
           status: '' | 'self_transport' | 'bus' | 'cannot_attend'; phone: string } =
    { guestName: '', category: '', status: '', phone: '' };
  companions: CompanionDraft[] = [];
  suggestions: string[] = [];
  showBusInfo = false;
  showClash = false;
  done = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  get deadlinePassed(): boolean { return new Date() > new Date(this.cfg.rsvp.deadlineISO); }

  async onNameInput() { this.suggestions = await this.guests.suggest(this.model.guestName); }

  valid(): boolean {
    if (!this.model.guestName.trim() || !this.model.category || !this.model.status) return false;
    if (this.model.status === 'bus' && !this.model.phone.trim()) return false;
    return true;
  }

  private draft(): RsvpDraft {
    return { guestName: this.model.guestName, category: this.model.category,
      status: this.model.status as any, phone: this.model.phone,
      companions: this.companions, deviceId: this.device.get() };
  }

  async trySubmit() {
    if (!this.valid()) return;
    if (await this.rsvp.checkClash(this.draft())) { this.showClash = true; return; }
    await this.rsvp.submit(this.draft());
    this.done = true;
  }

  async confirmDespiteClash() {
    this.showClash = false;
    await this.rsvp.submit(this.draft());
    this.done = true;
  }
}
