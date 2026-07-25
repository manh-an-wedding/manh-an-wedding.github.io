export interface Party { name: string; bank: string; account: string; qr: string; }
export interface FaqItem { qKey: string; aKey: string; showGiftQr?: boolean; }
export interface WeddingConfig {
  couple: { bride: string; groom: string };
  event: { name: string; venue: string; address: string; mapEmbedUrl: string;
           mapDirUrl: string; datetime: string; agendaKeys: string[] };
  rsvp: { groups: string[]; deadlineISO: string;
          bus: { pickup: string; departTime: string; duration: string } };
  gift: { bride: Party; groom: Party };
  faq: FaqItem[];
  theme: { primary: string; accent: string; fontHeading: string; fontBody: string; music: string };
  supabase: { url: string; anonKey: string };
  media: { coverImg: string; couplePhotos: string[] };
}
