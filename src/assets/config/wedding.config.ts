import { WeddingConfig } from '../../app/core/wedding-config';

export const WEDDING: WeddingConfig = {
  couple: { bride: 'Nhật An', groom: 'Duy Mạnh' },
  event: {
    name: 'Lễ Vu Quy',
    venue: '[TÊN NHÀ HÀNG - DATA GIẢ]',
    address: '123 Đường ABC, Ninh Kiều, Cần Thơ [DATA GIẢ]',
    mapEmbedUrl: 'https://www.google.com/maps?q=Can+Tho&output=embed',
    mapDirUrl: 'https://www.google.com/maps/dir/?api=1&destination=Can+Tho',
    datetime: '2026-11-15T10:00:00+07:00',
    agendaKeys: ['agenda.welcome', 'agenda.ceremony', 'agenda.lunch', 'agenda.party'],
  },
  rsvp: {
    groups: ['Bạn nhà trai', 'Bạn nhà gái', 'Họ hàng nhà trai', 'Họ hàng nhà gái', 'IAS'],
    deadlineISO: '2026-10-10',
    bus: { pickup: '[Điểm đón HCM - DATA GIẢ]', departTime: '06:00 15/11/2026', duration: '~4 giờ' },
  },
  gift: {
    bride: { name: 'Nhật An', bank: 'VCB [GIẢ]', account: '0000000000', qr: 'assets/img/qr-bride.png' },
    groom: { name: 'Duy Mạnh', bank: 'TCB [GIẢ]', account: '1111111111', qr: 'assets/img/qr-groom.png' },
  },
  faq: [
    { qKey: 'faq.gift.q', aKey: 'faq.gift.a', showGiftQr: true },
    { qKey: 'faq.bus.q', aKey: 'faq.bus.a' },
    { qKey: 'faq.oneway.q', aKey: 'faq.oneway.a' },
    { qKey: 'faq.returnonly.q', aKey: 'faq.returnonly.a' },
    { qKey: 'faq.cantho.q', aKey: 'faq.cantho.a' },
    { qKey: 'faq.daklak.q', aKey: 'faq.daklak.a' },
  ],
  theme: { primary: '#9E1B1B', accent: '#C9A24B', fontHeading: 'serif', fontBody: 'sans-serif',
           music: 'assets/audio/bg-music.mp3' },
  supabase: { url: 'https://bmhwpctxxfpculhigham.supabase.co',
              anonKey: 'sb_publishable_-O11WC89Xynpmtj6BiFseQ_iubAJjFy' },
  media: { coverImg: 'assets/img/cover.jpg', couplePhotos: ['assets/img/couple-1.jpg'] },
  // Bật/tắt từng phần. Tạm ẩn Q&A + Lời chúc (đổi thành true để hiện lại).
  sections: { wishes: false, faq: false },
};
