import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  ElementRef,
  Inject,
  HostListener,
} from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
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
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '../../directives/reveal-on-scroll.directive';
import { HappinessRainComponent } from '../../components/happiness-rain/happiness-rain.component';

@Component({
  selector: 'app-invite', standalone: true,
  imports: [DatePipe, TranslatePipe, LanguageToggleComponent, RsvpFormComponent,
            WishesComponent, FaqComponent, MapCalendarComponent,
            RevealOnScrollDirective, HappinessRainComponent],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit, OnDestroy {
  private visit = inject(VisitService);
  private device = inject(DeviceIdService);
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private document = inject(DOCUMENT);
  private slideshowTimer?: ReturnType<typeof setInterval>;
  private touchStartX: number | null = null;
  @ViewChild('audio') audio?: ElementRef<HTMLAudioElement>;
  lang: 'vi' | 'en' = 'vi';
  musicOn = false;
  coverOk = true;
  failedPhotoIndexes = new Set<number>();
  activeSlide = 0;
  lightboxOpen = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  async ngOnInit() {
    // Option C: lang comes from route data ({ lang: 'vi' } at '/', { lang: 'en' } at '/en')
    this.lang = this.route.snapshot.data['lang'] === 'en' ? 'en' : 'vi';
    this.translate.use(this.lang);
    this.startSlideshow();
    await this.visit.log(this.device.get());
  }

  ngOnDestroy() {
    this.stopSlideshow();
    this.document.body.classList.remove('album-lightbox-open');
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

  photoFailed(index: number) {
    this.failedPhotoIndexes.add(index);
    this.normalizeActiveSlide();
  }

  isPhotoVisible(index: number) {
    return !this.failedPhotoIndexes.has(index);
  }

  get visiblePhotos() {
    return this.cfg.media.photos
      .map((src, originalIndex) => ({ src, originalIndex }))
      .filter(({ originalIndex }) => this.isPhotoVisible(originalIndex));
  }

  selectPhoto(index: number) {
    const photoCount = this.visiblePhotos.length;
    if (!photoCount) return;
    this.activeSlide = ((index % photoCount) + photoCount) % photoCount;
    this.restartSlideshow();
  }

  previousPhoto() {
    this.selectPhoto(this.activeSlide - 1);
  }

  nextPhoto() {
    this.selectPhoto(this.activeSlide + 1);
  }

  openLightbox() {
    if (!this.visiblePhotos.length) return;
    this.lightboxOpen = true;
    this.stopSlideshow();
    this.document.body.classList.add('album-lightbox-open');
  }

  closeLightbox() {
    this.lightboxOpen = false;
    this.touchStartX = null;
    this.document.body.classList.remove('album-lightbox-open');
    this.startSlideshow();
  }

  startSwipe(event: TouchEvent) {
    this.touchStartX = event.changedTouches[0]?.clientX ?? null;
  }

  endSwipe(event: TouchEvent) {
    if (this.touchStartX === null) return;
    const endX = event.changedTouches[0]?.clientX ?? this.touchStartX;
    const distance = endX - this.touchStartX;
    this.touchStartX = null;

    if (Math.abs(distance) < 45) return;
    distance < 0 ? this.nextPhoto() : this.previousPhoto();
  }

  @HostListener('document:keydown', ['$event'])
  handleLightboxKeyboard(event: KeyboardEvent) {
    if (!this.lightboxOpen) return;

    if (event.key === 'Escape') {
      this.closeLightbox();
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.previousPhoto();
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      this.nextPhoto();
    }
  }

  private normalizeActiveSlide() {
    const photoCount = this.visiblePhotos.length;
    this.activeSlide = photoCount ? Math.min(this.activeSlide, photoCount - 1) : 0;
    this.restartSlideshow();
  }

  private restartSlideshow() {
    if (this.lightboxOpen) return;
    this.startSlideshow();
  }

  private startSlideshow() {
    this.stopSlideshow();
    if (this.visiblePhotos.length < 2 || this.lightboxOpen) return;
    this.slideshowTimer = setInterval(() => {
      const photoCount = this.visiblePhotos.length;
      if (photoCount > 1) {
        this.activeSlide = (this.activeSlide + 1) % photoCount;
      }
    }, 4000);
  }

  private stopSlideshow() {
    if (this.slideshowTimer) {
      clearInterval(this.slideshowTimer);
      this.slideshowTimer = undefined;
    }
  }
}
