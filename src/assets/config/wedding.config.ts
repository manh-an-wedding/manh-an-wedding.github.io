import { WeddingConfig } from '../../app/core/wedding-config';

const WEDDING_MEDIA_BASE_URL =
  'https://bmhwpctxxfpculhigham.supabase.co/storage/v1/object/public/wedding-media/v1';

// Single source of truth for shuttle times, shared by the RSVP form/panel and
// the Q&A entry so a time change only happens in one place.
const BUS = {
  outboundDepart1Time: '07:15',
  outboundDepart2Time: '07:50',
  eventDate: '17.10.26',
  restaurantArrivalTime: '10:45',
  returnDepartTime: '14:30',
  parkArrivalTime: '18:00',
  hotelArrivalTime: '18:45',
};

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
    agenda: [
      { time: '10:30', titleKey: 'agenda.welcome.title', pointKeys: ['agenda.welcome.p1', 'agenda.welcome.p2', 'agenda.welcome.p3'] },
      { time: '11:15', titleKey: 'agenda.ceremony.title', pointKeys: ['agenda.ceremony.p1', 'agenda.ceremony.p2', 'agenda.ceremony.p3'] },
      { time: '11:45', titleKey: 'agenda.party.title', pointKeys: ['agenda.party.p1', 'agenda.party.p2'] },
      { time: '13:00', titleKey: 'agenda.closing.title', pointKeys: ['agenda.closing.p1', 'agenda.closing.p2'] },
    ],
  },
  rsvp: {
    groups: ['Bạn của An', 'Bạn của Mạnh', 'Bạn của Tâm', 'Bạn cha Năm', 'Bạn mẹ Bắc', 'Họ hàng nhà gái'],
    deadlineISO: '2026-10-13T11:30:00+07:00',
    bus: BUS,
  },
  gift: {
    bride: { name: 'Nhật An', bank: '', account: '', qr: '' },
    groom: { name: 'Duy Mạnh', bank: '', account: '', qr: '' },
  },
  faq: [
    {
      qKey: 'faq.bus.q',
      items: [
        { textKey: 'faq.bus.items.pickup1', href: 'https://maps.app.goo.gl/A4G9MXVdHavg2cTq6', linkLabelKey: 'faq.actions.directions', params: { t1: BUS.outboundDepart1Time } },
        { textKey: 'faq.bus.items.pickup2', href: 'https://maps.app.goo.gl/Zc2hRpL585Z9NPHg8', linkLabelKey: 'faq.actions.directions', params: { t2: BUS.outboundDepart2Time } },
        { textKey: 'faq.bus.items.arrival', params: { arr: BUS.restaurantArrivalTime } },
        { textKey: 'faq.bus.items.return', params: { rdep: BUS.returnDepartTime, park: BUS.parkArrivalTime, hotel: BUS.hotelArrivalTime } },
        { textKey: 'faq.bus.items.breakfast' },
        { textKey: 'faq.bus.items.deadline' },
        { textKey: 'faq.bus.items.register' },
      ],
    },
    { qKey: 'faq.parking.q', aKey: 'faq.parking.a', showGiftQr: false },
    {
      qKey: 'faq.binhphu_parking.q',
      items: [
        { textKey: 'faq.binhphu_parking.items.a', href: 'https://maps.app.goo.gl/SWxbADzJunH858U46', linkLabelKey: 'faq.actions.location' },
      ],
    },
    {
      qKey: 'faq.amenities.q',
      sections: [
        {
          headingKey: 'faq.amenities.breakfast.heading',
          items: [
            { textKey: 'faq.amenities.breakfast.ibis' },
            { textKey: 'faq.amenities.breakfast.binhphu', img: 'assets/img/comtam.jpg' },
            { textKey: 'faq.amenities.breakfast.other' },
          ],
        },
        {
          headingKey: 'faq.amenities.restroom.heading',
          noteKey: 'faq.amenities.restroom.note',
          items: [
            { textKey: 'faq.amenities.restroom.ibis' },
            { textKey: 'faq.amenities.restroom.binhphu' },
          ],
        },
      ],
    },
    { qKey: 'faq.venue_parking.q', aKey: 'faq.venue_parking.a', showGiftQr: false },
    {
      qKey: 'faq.activities.q',
      items: [
        { textKey: 'faq.activities.items.loto' },
        {
          textKey: 'faq.activities.items.mykhanh',
          href: 'https://mykhanh.com/tat-muong-bat-ca-ms010',
          linkLabelKey: 'faq.actions.details',
        },
        { textKey: 'faq.activities.items.floating_market' },
        {
          textKey: 'faq.activities.items.conson',
          href: 'https://consoncantho.com/',
          linkLabelKey: 'faq.actions.details',
        },
        { textKey: 'faq.activities.items.nearby' },
      ],
    },
    {
      qKey: 'faq.food.q',
      items: [
        { textKey: 'faq.food.items.banh_xeo', href: 'https://share.google/bliD4Luw6Gk1YEDLM', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.food.items.banh_tam', href: 'https://share.google/vE7Bv11h9WXlFnpfh', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.food.items.vit_nau_chao', href: 'https://share.google/dUOicOilbGwt5YMA8', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.food.items.ca_loc', href: 'https://share.google/qK6D7FF1kF5aabX20', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.food.items.lua_nep', href: 'https://share.google/nskq5HvezlQbwMowm', linkLabelKey: 'faq.actions.directions' },
      ],
    },
    {
      qKey: 'faq.hotels.q',
      items: [
        { textKey: 'faq.hotels.items.lion_11', href: 'https://maps.app.goo.gl/AuYkjRSzbjUpL4GP8?g_st=ic', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.hotels.items.tru_by_hilton', href: 'https://maps.app.goo.gl/uFZ4YgQgD8mqdFDy7?g_st=ic', linkLabelKey: 'faq.actions.directions' },
        { textKey: 'faq.hotels.items.charmant_suites', href: 'https://maps.app.goo.gl/w8r3482E2vuDZYCK7?g_st=ic', linkLabelKey: 'faq.actions.directions' },
      ],
    },
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
  // Bật/tắt từng phần. Q&A đang hiển thị; Lời chúc tiếp tục được ẩn.
  sections: { wishes: false, faq: true },
};
