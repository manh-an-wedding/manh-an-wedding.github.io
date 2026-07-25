import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CoverComponent } from '../cover/cover.component';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';
import { RsvpFormComponent } from '../../components/rsvp-form/rsvp-form.component';
import { WishesComponent } from '../../components/wishes/wishes.component';
import { FaqComponent } from '../../components/faq/faq.component';
import { MapCalendarComponent } from '../../components/map-calendar/map-calendar.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-invite', standalone: true,
  imports: [CoverComponent, LanguageToggleComponent, RsvpFormComponent,
            WishesComponent, FaqComponent, MapCalendarComponent],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit {
  private visit = inject(VisitService);
  private device = inject(DeviceIdService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  @ViewChild('audio') audio?: ElementRef<HTMLAudioElement>;
  opened = false;
  lang: 'vi' | 'en' = 'vi';

  async ngOnInit() {
    this.lang = this.route.snapshot.data['lang'] === 'en' ? 'en' : 'vi';
    this.translate.use(this.lang);
    await this.visit.log(this.device.get());
  }
  open() {
    this.opened = true;
    this.audio?.nativeElement.play().catch(() => { /* autoplay may still block */ });
  }
}
