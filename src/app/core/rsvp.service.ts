import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';
import { nameNorm } from './name-normalize';

export interface CompanionDraft { name: string; joinsBus?: boolean; relation?: string; }
export interface RsvpDraft {
  guestName: string; category: string;
  status: 'self_transport' | 'bus' | 'cannot_attend';
  phone?: string; companions: CompanionDraft[]; deviceId: string;
}

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}

  async submit(d: RsvpDraft): Promise<void> {
    const { error } = await this.sb.rpc('submit_rsvp', {
      p_guest_name: d.guestName,
      p_name_norm: nameNorm(d.guestName),
      p_category: d.category,
      p_status: d.status,
      p_phone: d.status === 'bus' ? (d.phone ?? null) : null,
      p_companions: d.companions,
      p_device_id: d.deviceId,
    });
    if (error) throw error;
  }
}
