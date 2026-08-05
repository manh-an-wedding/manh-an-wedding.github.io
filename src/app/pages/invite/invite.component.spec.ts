import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { InviteComponent } from './invite.component';
import { MusicService } from '../../core/music.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';
import { vi } from 'vitest';

const testTranslations = {
  details: {
    groom_family: 'Nhà trai',
    bride_family: 'Nhà gái',
    father: 'Ông',
    mother: 'Bà',
    announcement: 'Trân trọng báo tin Lễ Vu Quy của',
    bride_birth_order: 'Trưởng Nữ',
    groom_birth_order: 'Trưởng Nam',
    ceremony_eyebrow: 'Hôn lễ được cử hành tại',
    ceremony_venue: 'Tư gia nhà gái',
    ceremony_lunar_date: '08 tháng 09 năm Bính Ngọ',
    reception_title: 'Thư mời',
    reception_invitation: 'Trân trọng kính mời quý khách đến chung vui cùng gia đình tại',
    reception_venue_label: 'Nhà Hàng, Khách sạn',
    reception_venue: 'VẠN PHÁT RIVERSIDE - SẢNH 01',
    reception_short_venue: 'Vạn Phát Riverside, Cần Thơ',
    reception_address: 'Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ',
    date: 'Ngày',
    ceremony_date: '17.10.2026',
    reception_date: 'Thứ 7 · 17.10.2026',
    rsvp_intro: 'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.',
  },
};

const englishTranslations = {
  details: {
    father: 'Father',
    mother: 'Mother',
    announcement: 'We respectfully announce the Vu Quy ceremony',
    bride_birth_order: 'Eldest Daughter',
    groom_birth_order: 'Eldest Son',
    ceremony_eyebrow: 'The ceremony will be held at',
    ceremony_venue: "the Bride's house",
    ceremony_lunar_date: '08 September, Year of the Fire Horse',
    reception_title: 'Invitation',
    reception_invitation: 'We cordially invite you to celebrate with the family at',
    reception_venue_label: 'Restaurant, Hotel',
    reception_venue: 'Van Phat Riverside - Hall 1',
    reception_short_venue: 'Van Phat Riverside, Can Tho',
    reception_address: '02 Nguyen Van Cu, Cai Khe ward, Can Tho',
    date: 'Date',
    ceremony_date: '17.10.2026',
    reception_date: 'Sat · 17.10.2026',
    lunar: 'Lunar date',
    time: 'Time',
    welcome: 'Guest welcome',
    start: 'Reception begins',
    rsvp_intro: 'Your presence would be a great honour to our families.',
  },
};

describe('InviteComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InviteComponent],
      providers: [provideRouter([]), provideTranslateService({})],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('vi', testTranslations);
  });

  it('reads lang from route data (defaults to vi)', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(f.componentInstance.lang).toBe('vi');
  });

  it('updates the document language for the English route', async () => {
    const route = TestBed.inject(ActivatedRoute);
    (route.snapshot as { data: Record<string, unknown> }).data = { lang: 'en' };
    const fixture = TestBed.createComponent(InviteComponent);

    await fixture.componentInstance.ngOnInit();

    expect((fixture.nativeElement as HTMLElement).ownerDocument.documentElement.lang).toBe('en');
  });

  it('music starts off (no cover click to auto-start)', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.musicOn()).toBe(false);
  });

  it('does not auto-scroll when autoplay is blocked', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    const component = fixture.componentInstance;
    const music = TestBed.inject(MusicService);
    const view = (fixture.nativeElement as HTMLElement).ownerDocument.defaultView!;
    vi.spyOn(music, 'tryAutoplay').mockResolvedValue(false);
    vi.spyOn(view, 'requestAnimationFrame').mockImplementation(() => 17);

    await component.ngOnInit();

    expect(component['autoScrollFrame']).toBeUndefined();
  });

  it('starts auto-scroll when the first gesture successfully starts blocked music', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    const component = fixture.componentInstance;
    const music = TestBed.inject(MusicService);
    const view = (fixture.nativeElement as HTMLElement).ownerDocument.defaultView!;
    vi.spyOn(music, 'tryAutoplay')
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    vi.spyOn(view, 'requestAnimationFrame').mockImplementation(() => 23);

    await component.ngOnInit();
    expect(component['autoScrollFrame']).toBeUndefined();

    await component['resumeAutoplayAfterGesture'](fixture.nativeElement);

    expect(component['autoScrollFrame']).toBe(23);
  });

  it('starts auto-scroll at 20 pixels per second', () => {
    const fixture = TestBed.createComponent(InviteComponent);
    const component = fixture.componentInstance;
    const music = TestBed.inject(MusicService);
    const view = (fixture.nativeElement as HTMLElement).ownerDocument.defaultView!;
    const documentElement = view.document.documentElement;
    const originalScrollHeight = Object.getOwnPropertyDescriptor(documentElement, 'scrollHeight');
    const callbacks: FrameRequestCallback[] = [];

    Object.defineProperty(documentElement, 'scrollHeight', {
      configurable: true,
      value: 2000,
    });
    const nowSpy = vi.spyOn(view.performance, 'now').mockReturnValue(100);
    const frameSpy = vi.spyOn(view, 'requestAnimationFrame').mockImplementation(callback => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancelFrameSpy = vi.spyOn(view, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const scrollSpy = vi.spyOn(view, 'scrollTo').mockImplementation(() => undefined);

    try {
      music.enableAutoScroll();
      component['startAutoScroll']();
      callbacks.shift()?.(150);

      expect(scrollSpy).toHaveBeenCalledTimes(1);
      expect(scrollSpy.mock.calls[0][0]).toBe(0);
      expect(scrollSpy.mock.calls[0][1]).toBeCloseTo(1, 5);
    } finally {
      component.ngOnDestroy();
      nowSpy.mockRestore();
      frameSpy.mockRestore();
      cancelFrameSpy.mockRestore();
      scrollSpy.mockRestore();
      if (originalScrollHeight) {
        Object.defineProperty(documentElement, 'scrollHeight', originalScrollHeight);
      } else {
        Reflect.deleteProperty(documentElement, 'scrollHeight');
      }
    }
  });

  it('ramps auto-scroll from 20 to 35 pixels per second across the first third of the cover', () => {
    const component = TestBed.createComponent(InviteComponent).componentInstance as unknown as {
      autoScrollSpeedPxPerMs(position: number, coverHeight: number): number;
    };

    expect(component.autoScrollSpeedPxPerMs(0, 120)).toBeCloseTo(.02, 5);
    expect(component.autoScrollSpeedPxPerMs(20, 120)).toBeCloseTo(.0275, 5);
    expect(component.autoScrollSpeedPxPerMs(40, 120)).toBeCloseTo(.035, 5);
    expect(component.autoScrollSpeedPxPerMs(120, 120)).toBeCloseTo(.035, 5);
  });

  it('shows Q&A while keeping wishes hidden', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.cfg.sections.wishes).toBe(false);
    expect(c.cfg.sections.faq).toBe(true);
  });

  it('opens with the invitation details over the cover image and uses configured music', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const heroNames = element.querySelector('.cover-couple')?.textContent ?? '';
    const coverText = element.querySelector('.cover-hero')?.textContent?.replace(/\s+/g, ' ') ?? '';

    expect(heroNames.indexOf('Nhật An')).toBeLessThan(heroNames.indexOf('Duy Mạnh'));
    expect(coverText).toContain('11:00');
    expect(coverText).toContain('Thứ 7 · 17.10.2026');
    const coverTime = element.querySelector('.cover-event-time');
    const coverDate = element.querySelector('.cover-event-date');
    expect(coverTime?.textContent?.trim()).toBe('11:00');
    expect(coverDate?.textContent?.trim()).toBe('Thứ 7 · 17.10.2026');
    expect(getComputedStyle(coverTime as Element).display).toBe('block');
    expect(getComputedStyle(coverDate as Element).display).toBe('block');
    expect(coverText).toContain('Vạn Phát Riverside');
    expect(Array.from(element.querySelectorAll('.save-the-day span'))
      .map(line => line.textContent?.trim()))
      .toEqual(['Save', 'The', 'Day']);
    expect(element.querySelector('.cover-image')?.getAttribute('src'))
      .toBe('https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/cover.jpg');
    expect(element.querySelector('.hero')).toBeNull();
    const music = TestBed.inject(MusicService);
    expect(element.querySelector('audio')).toBeNull();
    expect(music.source).toContain(fixture.componentInstance.cfg.theme.music);
    expect(music.volume).toBe(0.5);
  });

  it('renders the formal family, ceremony, and reception invitation details', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const sectionText = (selector: string) =>
      element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    expect(sectionText('.cover-hero')).toContain('Vạn Phát Riverside, Cần Thơ');
    expect(sectionText('.families')).toContain('Ông Lê Văn Năm');
    expect(element.querySelectorAll('.family-line')).toHaveLength(4);
    expect(sectionText('.invitation-intro')).not.toContain('Chú rể');
    expect(sectionText('.invitation-intro')).not.toContain('Cô dâu');
    expect(sectionText('.couple-person:first-child')).toContain('Nhật An');
    expect(sectionText('.couple-person:first-child')).toContain('Trưởng Nữ');
    expect(sectionText('.couple-person:last-child')).toContain('Duy Mạnh');
    expect(sectionText('.couple-person:last-child')).toContain('Trưởng Nam');
    expect(sectionText('.invitation-intro'))
      .toContain('Trân trọng báo tin Lễ Vu Quy của');
    expect(sectionText('.invitation-intro')).not.toContain('của chúng tôi');
    expect(sectionText('.ceremony-card')).toContain('08:00');
    expect(sectionText('.ceremony-card')).toContain('17.10.2026');
    expect(sectionText('.ceremony-card')).not.toContain('Thứ 7');
    expect(sectionText('.ceremony-card')).toContain('Tư gia nhà gái');
    expect(sectionText('.ceremony-card')).not.toContain('Bình Thủy, Cần Thơ');
    expect(sectionText('.reception-card')).toContain(
      'Trân trọng kính mời quý khách đến chung vui cùng gia đình tại',
    );
    expect(sectionText('.reception-card')).not.toContain('gia đình chúng tôi tại');
    expect(sectionText('.reception-venue-name'))
      .toContain('VẠN PHÁT RIVERSIDE - SẢNH 01');
    expect(element.querySelector('.reception-card .event-place')).not.toBeNull();
    expect(element.querySelector('.reception-card .event-place .reception-venue-name')).not.toBeNull();
    expect(sectionText('.reception-card')).toContain('10:30');
    expect(sectionText('.reception-card')).toContain('11:00');
    expect(sectionText('.reception-card')).toContain('Thứ 7 · 17.10.2026');
    expect(sectionText('.reception-card')).toContain(
      'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.',
    );
    expect(element.querySelector('.album h2')).toBeNull();
  });

  it('shows the bride family before the groom family', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const familyCards = Array.from(
      fixture.nativeElement.querySelectorAll('.families .family-card'),
    ) as HTMLElement[];
    const cardText = familyCards.map(card =>
      card.textContent?.replace(/\s+/g, ' ').trim() ?? '',
    );

    expect(cardText).toHaveLength(2);
    expect(cardText[0]).toContain('Nhà gái');
    expect(cardText[0]).toContain('Lê Văn Năm');
    expect(cardText[1]).toContain('Nhà trai');
    expect(cardText[1]).toContain('Lê Duy Tuấn');
  });

  it('renders the requested English ceremony and reception wording', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();

    const translate = TestBed.inject(TranslateService);
    translate.setTranslation('en', englishTranslations);
    translate.use('en');
    fixture.componentInstance.lang = 'en';
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const sectionText = (selector: string) =>
      element.querySelector(selector)?.textContent?.replace(/\s+/g, ' ').trim() ?? '';

    expect(sectionText('.cover-hero')).toContain('Van Phat Riverside, Can Tho');
    expect(sectionText('.cover-hero')).toContain('Sat · 17.10.2026');
    expect(sectionText('.invitation-intro'))
      .toContain('We respectfully announce the Vu Quy ceremony');
    expect(sectionText('.invitation-intro')).toContain('Eldest Daughter');
    expect(sectionText('.invitation-intro')).toContain('Eldest Son');
    expect(sectionText('.reception-card'))
      .toContain('We cordially invite you to celebrate with the family at');
    expect(sectionText('.ceremony-card')).toContain("the Bride's house");
    expect(sectionText('.ceremony-card')).toContain('17.10.2026');
    expect(sectionText('.ceremony-card')).not.toContain('Sat');
    expect(sectionText('.reception-card')).toContain('Sat · 17.10.2026');
    expect(sectionText('.ceremony-card')).toContain('Year of the Fire Horse');
    expect(sectionText('.reception-venue-name')).toContain('Van Phat Riverside - Hall 1');
    expect(sectionText('.reception-card'))
      .toContain('02 Nguyen Van Cu, Cai Khe ward, Can Tho');
  });

  it('separates the Vu Quy announcement from the reception and keeps RSVP after both', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const announcement = element.querySelector('.announcement-section');
    const separator = element.querySelector('.section-separator');
    const reception = element.querySelector('.reception-section');
    const rsvp = element.querySelector('app-rsvp-form');
    const order = Array.from(
      element.querySelectorAll('.announcement-section, .section-separator, .reception-section, app-rsvp-form'),
    ).map(item => item.classList.contains('announcement-section')
      ? 'announcement'
      : item.classList.contains('section-separator')
        ? 'separator'
        : item.classList.contains('reception-section')
          ? 'reception'
          : 'rsvp');

    expect(announcement).not.toBeNull();
    expect(reception).not.toBeNull();
    expect(announcement?.querySelector('.families')).not.toBeNull();
    expect(announcement?.querySelector('.invitation-intro')).not.toBeNull();
    expect(announcement?.querySelector('.ceremony-card')).not.toBeNull();
    expect(announcement?.querySelector('.reception-card')).toBeNull();
    expect(reception?.querySelector('.reception-card')).not.toBeNull();
    expect(separator?.textContent?.trim()).toBe('♡');
    expect(element.querySelector('.sheet-divider')?.textContent?.trim()).toBe('♡');
    expect(element.textContent).not.toContain('❦');
    expect(rsvp).not.toBeNull();
    expect(order).toEqual([
      'announcement',
      'separator',
      'reception',
      'separator',
      'rsvp',
      'separator',
      'separator',
    ]);
  });

  it('stagger-reveals static invitation groups while keeping RSVP as one interactive block', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const staggeredSections = Array.from(element.querySelectorAll('.reveal-stagger'));

    expect(staggeredSections.length).toBeGreaterThanOrEqual(6);
    for (const section of staggeredSections) {
      expect(section.querySelectorAll('.reveal-step').length).toBeGreaterThan(1);
    }
    expect(element.querySelector('app-rsvp-form')?.classList.contains('reveal-stagger')).toBe(false);
    expect(element.querySelector('.families .family-card .reveal-step')).not.toBeNull();
    expect(element.querySelector('.album .album-slider.reveal-step')).not.toBeNull();
  });

  it('keeps all three reception actions inside the reception section', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const announcement = element.querySelector('.announcement-section');
    const reception = element.querySelector('.reception-section');

    expect(announcement?.querySelectorAll('app-map-calendar a')).toHaveLength(0);
    expect(reception?.querySelectorAll('app-map-calendar .map-cal a')).toHaveLength(3);
    expect(element.querySelectorAll('.invite > app-map-calendar')).toHaveLength(0);
  });

  it('renders the reception date as a large event value like the reception times', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const dateRow = element.querySelector('.reception-date-row');
    const dateValue = dateRow?.querySelector('.event-value');

    expect(dateRow?.querySelector('.event-label')?.textContent?.trim()).toBe('Ngày');
    expect(dateValue?.textContent?.trim()).toBe('Thứ 7 · 17.10.2026');
    expect(element.querySelectorAll('.reception-card .event-time-grid .event-value')).toHaveLength(2);
  });

  it('groups every configured photo in one album at the end of the page', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const photoSources = Array.from(
      element.querySelectorAll('.album-slide img'),
      image => image.getAttribute('src'),
    );
    const moments = Array.from(
      element.querySelectorAll('.album-moment'),
      moment => moment.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(element.querySelectorAll('.photo-panel')).toHaveLength(0);
    expect(element.querySelector('.album')).not.toBeNull();
    expect(element.querySelectorAll('.album-slide img'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length);
    expect(element.querySelectorAll('.album-dots button'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length);
    expect(photoSources).toEqual([
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2018.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2019.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2020.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2021.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2022.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2023-2025.jpg',
      'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1/2026.jpg',
    ]);
    expect(moments).toEqual([
      '2018',
      '2019 Koh Hong',
      '2020 Đà Lạt',
      '2021 Đắk Lắk',
      '2022 Melaka',
      '2026 Kuala Lumpur',
    ]);
    expect(element.querySelectorAll('.album-moment')[0]?.querySelector('span')).toBeNull();
  });

  it('shows the whole portrait cover and album photos without cropping', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cover = element.querySelector<HTMLElement>('.cover-hero');
    const coverImage = element.querySelector<HTMLImageElement>('.cover-image');
    const albumStage = element.querySelector<HTMLElement>('.album-stage');
    const albumImages = Array.from(element.querySelectorAll<HTMLImageElement>('.album-slide img'));

    expect(cover?.style.aspectRatio).toBe('1440 / 2561');
    expect(coverImage?.style.objectFit).toBe('contain');
    expect(albumStage?.style.aspectRatio).toBe('4 / 5');
    expect(albumImages.every(image => image.style.objectFit === 'contain')).toBe(true);

    element.querySelector<HTMLButtonElement>('.album-slide')?.click();
    fixture.detectChanges();

    const lightboxImages = Array.from(
      element.querySelectorAll<HTMLImageElement>('.lightbox-slide img'),
    );
    expect(lightboxImages).toHaveLength(fixture.componentInstance.cfg.media.photos.length);
    expect(lightboxImages.every(image => image.style.objectFit === 'contain')).toBe(true);
    expect(lightboxImages.every(image => image.style.width === 'auto')).toBe(true);
    expect(lightboxImages.every(image => image.style.height === 'var(--lightbox-height)')).toBe(true);
    expect(lightboxImages.every(image => image.style.maxWidth === '100%')).toBe(true);
    expect(lightboxImages.every(image => image.style.maxHeight === 'var(--lightbox-height)')).toBe(true);
  });

  it('replaces broken Supabase images with the local happiness fallback', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const cover = element.querySelector<HTMLImageElement>('.cover-image');
    const firstPhoto = element.querySelector<HTMLImageElement>('.album-slide img');
    cover?.dispatchEvent(new Event('error'));
    firstPhoto?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelector<HTMLImageElement>('.cover-image')?.getAttribute('src'))
      .toBe('assets/img/happiness-fallback.svg');
    expect(element.querySelector<HTMLImageElement>('.album-slide img')?.getAttribute('src'))
      .toBe('assets/img/happiness-fallback.svg');
    expect(element.querySelectorAll('.album-slide'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length);
  });
});
