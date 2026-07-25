import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';

@Injectable({ providedIn: 'root' })
export class GuestsService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}
  async suggest(prefix: string): Promise<string[]> {
    if (prefix.trim().length < 1) return [];
    const { data } = await this.sb.from('guests_public').select('full_name').ilike('full_name', `%${prefix}%`).limit(8);
    return (data ?? []).map((r: any) => r.full_name);
  }
}
