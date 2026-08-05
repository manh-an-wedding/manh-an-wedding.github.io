import {
  Component,
  OnInit,
  OnDestroy,
  inject,
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
import { WEDDING_CONFIG } from '../../core/wedding-config.token';
import { WeddingConfig } from '../../core/wedding-config';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { RevealOnScrollDirective } from '../../directives/reveal-on-scroll.directive';
import { HappinessRainComponent } from '../../components/happiness-rain/happiness-rain.component';
import { MusicService } from '../../core/music.service';

interface PhotoMoment {
  year: string;
  place: string;
}

const PHOTO_MOMENTS: Record<string, PhotoMoment> = {
  '2018': { year: '2018', place: '' },
  '2019': { year: '2019', place: 'Koh Hong' },
  '2020': { year: '2020', place: 'Đà Lạt' },
  '2021': { year: '2021', place: 'Đắk Lắk' },
  '2022': { year: '2022', place: 'Melaka' },
  '2026': { year: '2026', place: 'Kuala Lumpur' },
};

@Component({
  selector: 'app-invite', standalone: true,
  imports: [DatePipe, TranslatePipe, LanguageToggleComponent, RsvpFormComponent,
            WishesComponent, FaqComponent, MapCalendarComponent,
            RevealOnScrollDirective, HappinessRainComponent],
  templateUrl: './invite.component.html',
})
export class InviteComponent implements OnInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private translate = inject(TranslateService);
  private document = inject(DOCUMENT);
  private music = inject(MusicService);
  private slideshowTimer?: ReturnType<typeof setInterval>;
  private autoScrollFrame?: number;
  private lastAutoScrollTime = 0;
  private autoScrollPosition = 0;
  private readonly autoScrollMinSpeedPxPerMs = .02;
  private readonly autoScrollMaxSpeedPxPerMs = .035;
  private autoplayWaitingForGesture = false;
  private touchStartX: number | null = null;
  readonly musicOn = this.music.playing;
  readonly imageFallback = 'assets/img/happiness-fallback.svg';
  lang: 'vi' | 'en' = 'vi';
  activeSlide = 0;
  lightboxOpen = false;

  constructor(@Inject(WEDDING_CONFIG) public cfg: WeddingConfig) {}

  async ngOnInit() {
    try {
      this.document.defaultView?.localStorage.removeItem('manhan_device_id');
    } catch {
      // Storage may be unavailable in a restricted/private browsing context.
    }
    // Option C: lang comes from route data ({ lang: 'vi' } at '/', { lang: 'en' } at '/en')
    this.lang = this.route.snapshot.data['lang'] === 'en' ? 'en' : 'vi';
    this.document.documentElement.lang = this.lang;
    this.translate.use(this.lang);
    this.startSlideshow();
    this.music.initializeAutoScroll();
    if (this.music.playing()) {
      this.autoplayWaitingForGesture = false;
      if (this.music.autoScrollEnabled()) {
        this.startAutoScroll();
      }
    } else {
      const started = await this.music.tryAutoplay();
      this.autoplayWaitingForGesture = !started;
      if (started && this.music.autoScrollEnabled()) {
        this.startAutoScroll();
      }
    }
  }

  ngOnDestroy() {
    this.stopSlideshow();
    this.stopAutoScrollAnimation();
    this.document.body.classList.remove('album-lightbox-open');
  }

  async toggleMusic() {
    const started = await this.music.toggle();
    this.autoplayWaitingForGesture = false;
    if (started) {
      this.music.enableAutoScroll();
      this.startAutoScroll();
    } else {
      this.stopAutoScrollAnimation();
    }
  }

  @HostListener('document:pointerdown', ['$event'])
  resumeAutoplayOnFirstGesture(event: PointerEvent) {
    void this.resumeAutoplayAfterGesture(event.target);
  }

  @HostListener('window:wheel')
  @HostListener('window:touchmove')
  stopAutoScrollFromUser() {
    this.music.stopAutoScroll();
    this.stopAutoScrollAnimation();
  }

  useImageFallback(event: Event) {
    const image = event.target;
    if (!(image instanceof HTMLImageElement)
        || image.getAttribute('src') === this.imageFallback) return;
    image.setAttribute('src', this.imageFallback);
  }

  get visiblePhotos() {
    return this.cfg.media.photos
      .map((src, originalIndex) => ({
        src,
        originalIndex,
        moment: this.photoMoment(src),
      }));
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
    void this.resumeAutoplayAfterGesture(event.target);
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) {
      this.stopAutoScrollFromUser();
    }
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

  private photoMoment(src: string): PhotoMoment | undefined {
    const filename = src.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, '').toLowerCase();
    return filename ? PHOTO_MOMENTS[filename] : undefined;
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

  private startAutoScroll() {
    const view = this.document.defaultView;
    if (!view || this.autoScrollFrame !== undefined || !this.music.autoScrollEnabled()) return;

    this.lastAutoScrollTime = view.performance.now();
    this.autoScrollPosition = view.scrollY;
    const measuredCoverHeight = this.document
      .querySelector<HTMLElement>('.cover-hero')
      ?.getBoundingClientRect().height ?? 0;
    const coverHeight = measuredCoverHeight > 0 ? measuredCoverHeight : view.innerHeight;
    const scrollStep = (timestamp: number) => {
      if (!this.music.autoScrollEnabled()) {
        this.autoScrollFrame = undefined;
        return;
      }

      const maxScroll = Math.max(0, this.document.documentElement.scrollHeight - view.innerHeight);
      if (this.autoScrollPosition >= maxScroll - 1) {
        this.music.stopAutoScroll();
        this.autoScrollFrame = undefined;
        return;
      }

      const elapsed = Math.min(timestamp - this.lastAutoScrollTime, 50);
      this.lastAutoScrollTime = timestamp;
      const speed = this.autoScrollSpeedPxPerMs(this.autoScrollPosition, coverHeight);
      this.autoScrollPosition = Math.min(maxScroll, this.autoScrollPosition + elapsed * speed);
      view.scrollTo(0, this.autoScrollPosition);
      this.autoScrollFrame = view.requestAnimationFrame(scrollStep);
    };

    this.autoScrollFrame = view.requestAnimationFrame(scrollStep);
  }

  private autoScrollSpeedPxPerMs(position: number, coverHeight: number): number {
    const rampDistance = Math.max(coverHeight / 3, 1);
    const coverProgress = Math.min(1, Math.max(0, position / rampDistance));
    return this.autoScrollMinSpeedPxPerMs
      + (this.autoScrollMaxSpeedPxPerMs - this.autoScrollMinSpeedPxPerMs) * coverProgress;
  }

  private stopAutoScrollAnimation() {
    const view = this.document.defaultView;
    if (view && this.autoScrollFrame !== undefined) {
      view.cancelAnimationFrame(this.autoScrollFrame);
    }
    this.autoScrollFrame = undefined;
  }

  private async resumeAutoplayAfterGesture(target: EventTarget | null) {
    if (!this.autoplayWaitingForGesture || this.music.playing()) return;
    if (target instanceof Element && target.closest('.music-btn')) return;

    this.autoplayWaitingForGesture = false;
    const started = await this.music.tryAutoplay();
    this.autoplayWaitingForGesture = !started;
    if (started && this.music.autoScrollEnabled()) {
      this.startAutoScroll();
    }
  }
}
