import { WeddingConfig } from '../../app/core/wedding-config';

const WEDDING_MEDIA_BASE_URL =
  'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1';

export const WEDDING: WeddingConfig = {
  couple: { bride: 'Nhật An', groom: 'Duy Mạnh' },
  families: {
    groom: {
      father: 'Lê Duy Tuấn',
      mother: 'Nguyễn Thị Anh',
      address: 'Ea Ktur, Đắk Lắk',
    },
    bride: {
      father: 'Lê Văn Năm',
      mother: 'Tống Thị Bắc',
      address: 'Bình Thủy, Cần Thơ',
    },
  },
  ceremony: {
    name: 'Lễ Vu Quy',
    datetime: '2026-10-17T08:00:00+07:00',
    lunarDate: '08 tháng 09 năm Bính Ngọ',
    venue: 'Tư gia nhà gái',
    address: 'Bình Thủy, Cần Thơ',
  },
  reception: {
    name: 'Tiệc cưới',
    welcomeTime: '10:30',
    datetime: '2026-10-17T11:00:00+07:00',
    lunarDate: '08 tháng 09 năm Bính Ngọ',
    venue: 'VẠN PHÁT RIVERSIDE - SẢNH 01',
    shortVenue: 'Vạn Phát Riverside, Cần Thơ',
    address: 'Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ',
    mapEmbedUrl: 'https://www.google.com/maps?q=Van+Phat+Riverside+Can+Tho&output=embed&hl=vi',
    mapDirUrl: 'https://maps.app.goo.gl/of7FJD3HC6WWPuv7A',
    calendarDurationHours: 2.5,
  },
  event: {
    name: 'Tiệc cưới',
    venue: 'VẠN PHÁT RIVERSIDE - SẢNH 01',
    address: 'Số 02 Nguyễn Văn Cừ (Cồn Khương), phường Cái Khế, TP Cần Thơ',
    mapEmbedUrl: 'https://www.google.com/maps?q=Van+Phat+Riverside+Can+Tho&output=embed&hl=vi',
    mapDirUrl: 'https://maps.app.goo.gl/of7FJD3HC6WWPuv7A',
    datetime: '2026-10-17T11:00:00+07:00',
    agendaKeys: ['agenda.welcome', 'agenda.ceremony', 'agenda.lunch', 'agenda.party'],
  },
  rsvp: {
    groups: ['Họ hàng nhà gái', 'Bạn cha Năm', 'Bạn mẹ Bắc', 'Tiến bước', 'IAS', 'ZAD', 'MWG', 'RVC', 'Bạn của An', 'Bạn của Tâm'],
    deadlineISO: '2026-10-10T11:30:00+07:00',
    bus: {
      pickup: 'Ibis hotel, 2 Hồng Hà, Tân Sơn Hòa, Hồ Chí Minh',
      departTime: '7:15 17.10.2026',
      restaurantArrivalTime: '10:45',
      returnDepartTime: '13:30',
      hotelArrivalTime: '17:30',
    },
  },
  gift: {
    bride: { name: 'Nhật An', bank: '', account: '', qr: '' },
    groom: { name: 'Duy Mạnh', bank: '', account: '', qr: '' },
  },
  faq: [
    { qKey: 'faq.gift.q', aKey: 'faq.gift.a', showGiftQr: false },
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
  media: {
    coverImg: `${WEDDING_MEDIA_BASE_URL}/cover.jpg`,
    photos: [
      `${WEDDING_MEDIA_BASE_URL}/2018.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2019.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2020.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2021.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2022.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2023-2025.jpg`,
      `${WEDDING_MEDIA_BASE_URL}/2026.jpg`,
    ],
  },
  // Bật/tắt từng phần. Tạm ẩn Q&A + Lời chúc (đổi thành true để hiện lại).
  sections: { wishes: false, faq: false },
};
