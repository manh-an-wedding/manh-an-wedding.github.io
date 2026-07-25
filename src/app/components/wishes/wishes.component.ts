import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '@ngx-translate/core';
import { WishesService } from '../../core/wishes.service';
import { DeviceIdService } from '../../core/device-id.service';

@Component({
  selector: 'app-wishes', standalone: true, imports: [FormsModule, TranslatePipe],
  template: `
    <section class="wishes">
      <h2>{{ 'wishes.title' | translate }}</h2>
      <input [(ngModel)]="name" placeholder="{{ 'rsvp.your_name' | translate }}">
      <textarea [(ngModel)]="message" placeholder="{{ 'wishes.placeholder' | translate }}"></textarea>
      <label><input type="radio" [value]="true" [(ngModel)]="isPublic"> {{ 'wishes.public' | translate }}</label>
      <label><input type="radio" [value]="false" [(ngModel)]="isPublic"> {{ 'wishes.private' | translate }}</label>
      <button type="button" [disabled]="!name.trim() || !message.trim()" (click)="send()">
        {{ 'wishes.send' | translate }}</button>

      <h3>{{ 'wishes.wall' | translate }}</h3>
      @for (w of wall; track w.id) { <blockquote><b>{{ w.name }}</b>: {{ w.message }}</blockquote> }
    </section>`,
})
export class WishesComponent implements OnInit {
  private svc = inject(WishesService);
  private device = inject(DeviceIdService);
  name = ''; message = ''; isPublic = true;
  wall: any[] = [];
  async ngOnInit() { this.wall = await this.svc.listPublic(); }
  async send() {
    await this.svc.add({ name: this.name, message: this.message, isPublic: this.isPublic,
      deviceId: this.device.get() });
    this.name = ''; this.message = '';
    this.wall = await this.svc.listPublic();
  }
}
