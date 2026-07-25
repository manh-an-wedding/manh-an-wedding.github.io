import { WEDDING } from '../../assets/config/wedding.config';

describe('wedding config (fake data)', () => {
  it('has both names, one event, groups, gift QRs and faq', () => {
    expect(WEDDING.couple.bride).toBe('Nhật An');
    expect(WEDDING.couple.groom).toBe('Duy Mạnh');
    expect(WEDDING.event.name).toContain('Vu Quy');
    expect(WEDDING.rsvp.groups.length).toBeGreaterThan(0);
    expect(WEDDING.gift.bride.account).toBeTruthy();
    expect(WEDDING.gift.groom.account).toBeTruthy();
    expect(WEDDING.faq.length).toBeGreaterThanOrEqual(6);
    expect(WEDDING.supabase.url).toBeTruthy();
  });
});
