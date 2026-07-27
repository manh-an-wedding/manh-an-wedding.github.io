import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InviteComponent } from './invite.component';
import { VisitService } from '../../core/visit.service';
import { DeviceIdService } from '../../core/device-id.service';
import { MusicService } from '../../core/music.service';
import { provideTranslateService, TranslateService } from '@ngx-translate/core';

class VisitStub { count = 0; log = async () => { this.count++; }; }

const testTranslations = {
  details: {
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
    lunar: 'Lunar date',
    time: 'Time',
    welcome: 'Guest welcome',
    start: 'Reception begins',
    rsvp_intro: 'Your presence would be a great honour to our families.',
  },
};

describe('InviteComponent', () => {
  let visit: VisitStub;
  beforeEach(async () => {
    visit = new VisitStub();
    await TestBed.configureTestingModule({
      imports: [InviteComponent],
      providers: [ provideRouter([]), provideTranslateService({}),
        { provide: VisitService, useValue: visit },
        { provide: DeviceIdService, useValue: { get: () => 'dev-1' } } ],
    }).compileComponents();
    TestBed.inject(TranslateService).setTranslation('vi', testTranslations);
  });

  it('logs a visit on init', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(visit.count).toBe(1);
  });

  it('reads lang from route data (defaults to vi)', async () => {
    const f = TestBed.createComponent(InviteComponent);
    await f.componentInstance.ngOnInit();
    expect(f.componentInstance.lang).toBe('vi');
  });

  it('music starts off (no cover click to auto-start)', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.musicOn()).toBe(false);
  });

  it('exposes section toggles (wishes + faq hidden by default)', () => {
    const c = TestBed.createComponent(InviteComponent).componentInstance;
    expect(c.cfg.sections.wishes).toBe(false);
    expect(c.cfg.sections.faq).toBe(false);
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
    expect(coverText).toContain('17/10/2026');
    expect(coverText).toContain('Vạn Phát Riverside');
    expect(Array.from(element.querySelectorAll('.save-the-day span'))
      .map(line => line.textContent?.trim()))
      .toEqual(['Save', 'The', 'Day']);
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
    expect(sectionText('.reception-card')).toContain('10:15');
    expect(sectionText('.reception-card')).toContain('11:00');
    expect(sectionText('.reception-card')).toContain(
      'Sự hiện diện của quý khách là niềm vinh hạnh cho gia đình chúng tôi.',
    );
    expect(element.querySelector('.album h2')).toBeNull();
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
    expect(sectionText('.invitation-intro'))
      .toContain('We respectfully announce the Vu Quy ceremony');
    expect(sectionText('.invitation-intro')).toContain('Eldest Daughter');
    expect(sectionText('.invitation-intro')).toContain('Eldest Son');
    expect(sectionText('.reception-card'))
      .toContain('We cordially invite you to celebrate with the family at');
    expect(sectionText('.ceremony-card')).toContain("the Bride's house");
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
    ]);
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
    expect(dateValue?.textContent?.trim()).toBe('17.10.2026');
    expect(element.querySelectorAll('.reception-card .event-time-grid .event-value')).toHaveLength(2);
  });

  it('groups every configured photo in one album at the end of the page', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelectorAll('.photo-panel')).toHaveLength(0);
    expect(element.querySelector('.album')).not.toBeNull();
    expect(element.querySelectorAll('.album-slide img'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length);
    expect(element.querySelectorAll('.album-dots button'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length);
  });

  it('removes a broken photo and its empty album frame', async () => {
    const fixture = TestBed.createComponent(InviteComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const element = fixture.nativeElement as HTMLElement;
    const firstPhoto = element.querySelector('.album-slide img');
    firstPhoto?.dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(element.querySelectorAll('.album-slide'))
      .toHaveLength(fixture.componentInstance.cfg.media.photos.length - 1);
  });
});
