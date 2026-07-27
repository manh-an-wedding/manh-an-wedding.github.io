import { WEDDING } from '../../assets/config/wedding.config';

describe('wedding config', () => {
  it('has both names, one event, groups, gift QRs and faq', () => {
    expect(WEDDING.couple.bride).toBe('Nhật An');
    expect(WEDDING.couple.groom).toBe('Duy Mạnh');
    expect(WEDDING.ceremony.name).toContain('Vu Quy');
    expect(WEDDING.rsvp.groups.length).toBeGreaterThan(0);
    expect(WEDDING.gift.bride.account).toBeTruthy();
    expect(WEDDING.gift.groom.account).toBeTruthy();
    expect(WEDDING.faq.length).toBeGreaterThanOrEqual(6);
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
    expect(WEDDING.reception.welcomeTime).toBe('10:15');
    expect(WEDDING.reception.datetime).toBe('2026-10-17T11:00:00+07:00');
    expect(WEDDING.reception.venue).toBe('VẠN PHÁT RIVERSIDE - SẢNH 01');
    expect(WEDDING.reception.shortVenue).toBe('Vạn Phát Riverside, Cần Thơ');
    expect(WEDDING.reception.calendarDurationHours).toBe(2.5);
    expect(WEDDING.reception.mapEmbedUrl).toContain('hl=vi');
    expect(WEDDING.reception.mapDirUrl)
      .toBe('https://maps.app.goo.gl/of7FJD3HC6WWPuv7A');
    expect(WEDDING.rsvp.bus).toEqual({
      pickup: 'Ibis hotel, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh',
      departTime: '7:30 17.10.2026',
      restaurantArrivalTime: '10:30',
      returnDepartTime: '13:30',
      hotelArrivalTime: '17:00',
    });
    expect(WEDDING.event.venue).toBe('VẠN PHÁT RIVERSIDE - SẢNH 01');
  });

  it('uses one temporary image in all four photo positions and keeps optional sections hidden', () => {
    expect(WEDDING.media.photos).toHaveLength(4);
    expect(new Set(WEDDING.media.photos).size).toBe(1);
    expect(WEDDING.sections).toEqual({ wishes: false, faq: false });
  });
});
