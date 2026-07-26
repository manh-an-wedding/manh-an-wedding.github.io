export interface Party { name: string; bank: string; account: string; qr: string; }
export interface FaqItem { qKey: string; aKey: string; showGiftQr?: boolean; }
export interface FamilyInfo {
  father: string;
  mother: string;
  address: string;
}
export interface CeremonyInfo {
  name: string;
  datetime: string;
  lunarDate: string;
  venue: string;
  address: string;
}
export interface ReceptionInfo {
  name: string;
  welcomeTime: string;
  datetime: string;
  lunarDate: string;
  venue: string;
  shortVenue: string;
  address: string;
  mapEmbedUrl: string;
  mapDirUrl: string;
  calendarDurationHours: number;
}
export interface WeddingConfig {
  couple: { bride: string; groom: string };
  families: { groom: FamilyInfo; bride: FamilyInfo };
  ceremony: CeremonyInfo;
  reception: ReceptionInfo;
  event: { name: string; venue: string; address: string; mapEmbedUrl: string;
           mapDirUrl: string; datetime: string; agendaKeys: string[] };
  rsvp: { groups: string[]; deadlineISO: string;
          bus: {
            pickup: string;
            departTime: string;
            restaurantArrivalTime: string;
            returnDepartTime: string;
            hotelArrivalTime: string;
          } };
  gift: { bride: Party; groom: Party };
  faq: FaqItem[];
  theme: { primary: string; accent: string; fontHeading: string; fontBody: string; music: string };
  supabase: { url: string; anonKey: string };
  media: { coverImg: string; couplePhotos: string[]; photos: string[] };
  sections: { wishes: boolean; faq: boolean };
}
