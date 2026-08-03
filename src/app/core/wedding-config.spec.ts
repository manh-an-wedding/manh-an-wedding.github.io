import { WEDDING } from '../../assets/config/wedding.config';

describe('wedding config', () => {
  it('has both names, RSVP groups, disabled placeholder gifts, and FAQ config', () => {
    expect(WEDDING.couple.bride).toBe('Nhật An');
    expect(WEDDING.couple.groom).toBe('Duy Mạnh');
    expect(WEDDING.ceremony.name).toContain('Vu Quy');
    expect(WEDDING.rsvp.groups.length).toBeGreaterThan(0);
    expect(WEDDING.rsvp.groups).toContain('Bạn của Tâm');
    expect(WEDDING.gift.bride.account).toBe('');
    expect(WEDDING.gift.groom.account).toBe('');
    expect(WEDDING.faq[0].showGiftQr).toBe(false);
    expect(WEDDING.faq.map(item => item.qKey)).toEqual([
      'faq.venue_parking.q',
      'faq.parking.q',
      'faq.activities.q',
      'faq.food.q',
    ]);
    expect(WEDDING.faq).toHaveLength(4);
    expect(WEDDING.faq[2].items?.filter(item => item.href)).toHaveLength(2);
    expect(WEDDING.faq[3].items?.filter(item => item.href)).toHaveLength(5);
    expect(WEDDING.supabase.url).toBeTruthy();
  });

  it('keeps the confirmed ceremony and reception details separate', () => {
    expect(WEDDING.families.groom.father).toBe('Lê Duy Tuấn');
    expect(WEDDING.families.groom.address).toBe('Ea Ktur, Đắk Lắk');
    expect(WEDDING.families.bride.father).toBe('Lê Văn Năm');
    expect(WEDDING.families.bride.mother).toBe('Tống Thị Bắc');
    expect(WEDDING.families.bride.address).toBe('Bình Thủy, Cần Thơ');
    expect(WEDDING.ceremony.datetime).toBe('2026-10-17T08:00:00+07:00');
    expect(WEDDING.ceremony.address).toBe('Bình Thủy, Cần Thơ');
    expect(WEDDING.reception.welcomeTime).toBe('10:30');
    expect(WEDDING.reception.datetime).toBe('2026-10-17T11:00:00+07:00');
    expect(WEDDING.reception.venue).toBe('VẠN PHÁT RIVERSIDE - SẢNH 01');
    expect(WEDDING.reception.shortVenue).toBe('Vạn Phát Riverside, Cần Thơ');
    expect(WEDDING.reception.calendarDurationHours).toBe(2.5);
    expect(WEDDING.reception.mapEmbedUrl).toContain('hl=vi');
    expect(WEDDING.reception.mapDirUrl)
      .toBe('https://maps.app.goo.gl/of7FJD3HC6WWPuv7A');
    expect(WEDDING.rsvp.deadlineISO).toBe('2026-10-10T11:30:00+07:00');
    expect(WEDDING.rsvp.bus).toEqual({
      pickup: 'Ibis hotel, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh',
      departTime: '7:15 · Thứ 7 · 17.10.2026',
      restaurantArrivalTime: '10:45',
      returnDepartTime: '13:30',
      hotelArrivalTime: '17:30',
    });
    expect(WEDDING.event.venue).toBe('VẠN PHÁT RIVERSIDE - SẢNH 01');
  });

  it('uses the chronological wedding album, shows Q&A, and keeps wishes hidden', () => {
    const mediaBaseUrl = 'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1';

    expect(WEDDING.media.coverImg).toBe(`${mediaBaseUrl}/cover.jpg`);
    expect(WEDDING.media.photos).toEqual([
      `${mediaBaseUrl}/2018.jpg`,
      `${mediaBaseUrl}/2019.jpg`,
      `${mediaBaseUrl}/2020.jpg`,
      `${mediaBaseUrl}/2021.jpg`,
      `${mediaBaseUrl}/2022.jpg`,
      `${mediaBaseUrl}/2023-2025.jpg`,
      `${mediaBaseUrl}/2026.jpg`,
    ]);
    expect(WEDDING.sections).toEqual({ wishes: false, faq: true });
  });
});
