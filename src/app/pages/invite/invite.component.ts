import { Component, OnInit, inject, ViewChild, ElementRef, Inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LanguageToggleComponent } from '../../components/language-toggle/language-toggle.component';
import { RsvpFormComponent } from '../../components/rsvp-form/rsvp-form.component';
import { WishesComponent } from '../../components/wishes/wishes.component';
import { FaqComponent } from '../../components/faq/faq.component';
import { MapCalendarComponent } from '../../components/map-calendar/map-calendar.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-invite', standalone: true,
  imports: [LanguageToggleComponent, RsvpFormComponent,
            WishesComponent, FaqComponent, MapCalendarComponent],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit {
  private visit = inject(VisitService);
  private device = inject(DeviceIdService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  @ViewChild('audio') audio?: ElementRef<HTMLAudioElement>;
  lang: 'vi' | 'en' = 'vi';
  musicOn = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  async ngOnInit() {
    // Option C: lang comes from route data ({ lang: 'vi' } at '/', { lang: 'en' } at '/en')
    this.lang = this.route.snapshot.data['lang'] === 'en' ? 'en' : 'vi';
    this.translate.use(this.lang);
    await this.visit.log(this.device.get());
  }

  toggleMusic() {
    const el = this.audio?.nativeElement;
    if (!el) return;
    if (el.paused) {
      el.play().then(() => (this.musicOn = true)).catch(() => (this.musicOn = false));
    } else {
      el.pause();
      this.musicOn = false;
    }
  }
}
