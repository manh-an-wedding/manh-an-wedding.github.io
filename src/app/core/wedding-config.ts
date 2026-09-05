export interface Party { name: string; bank: string; account: string; qr: string; }
export interface FaqAnswerItem {
  textKey: string;
  href?: string;
  linkLabelKey?: string;
  params?: Record<string, string>;
}

export interface FaqItem {
  qKey: string;
  aKey?: string;
  items?: FaqAnswerItem[];
  showGiftQr?: boolean;
}

export interface AgendaItem {
  time: string;
  titleKey: string;
  pointKeys: string[];
}
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
           mapDirUrl: string; datetime: string; agenda: AgendaItem[] };
  rsvp: { groups: string[]; deadlineISO: string;
          bus: {
            outboundDepart1Time: string;
            outboundDepart2Time: string;
            eventDate: string;
            restaurantArrivalTime: string;
            returnDepartTime: string;
            parkArrivalTime: string;
            hotelArrivalTime: string;
          } };
  gift: { bride: Party; groom: Party };
  faq: FaqItem[];
  theme: { primary: string; accent: string; fontHeading: string; fontBody: string; music: string };
  supabase: { url: string; anonKey: string };
  media: { coverImg: string; photos: string[] };
  sections: { wishes: boolean; faq: boolean };
}
