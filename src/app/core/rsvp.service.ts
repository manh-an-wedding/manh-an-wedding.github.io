import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';
import { nameNorm } from './name-normalize';

export interface CompanionDraft { name: string; joinsBus: boolean; relation?: string; }
export interface RsvpDraft {
  guestName: string; category: string;
  status: 'self_transport' | 'bus' | 'cannot_attend';
  phone?: string; companions: CompanionDraft[]; deviceId: string;
}

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}

  async checkClash(d: RsvpDraft): Promise<boolean> {
    const norm = nameNorm(d.guestName);
    const { data } = await this.sb.from('rsvp').select('device_id,ip')
      .eq('name_norm', norm).eq('category', d.category).eq('status', d.status);
    const rows = data ?? [];
    return rows.length > 0 && rows.every(r => r.device_id !== d.deviceId);
  }

  async submit(d: RsvpDraft): Promise<void> {
    const partySize = 1 + d.companions.length;
    const { data, error } = await this.sb.from('rsvp').insert({
      guest_name: d.guestName, name_norm: nameNorm(d.guestName), category: d.category,
      status: d.status, phone: d.status === 'bus' ? (d.phone ?? null) : null,
      party_size: partySize, device_id: d.deviceId,
    }).select().single();
    if (error) throw error;
    if (d.companions.length) {
      await this.sb.from('companions').insert(
        d.companions.map(c => ({ rsvp_id: (data as any).id, name: c.name,
          joins_bus: c.joinsBus, relation: c.relation ?? null })));
    }
  }
}
