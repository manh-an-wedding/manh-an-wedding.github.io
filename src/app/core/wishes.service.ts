import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';

export interface WishDraft {
  name: string;
  message: string;
  isPublic: boolean;
}

@Injectable({ providedIn: 'root' })
export class WishesService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}
  async add(w: WishDraft) {
    const { error } = await this.sb.rpc('submit_wish', {
      p_name: w.name,
      p_message: w.message,
      p_is_public: w.isPublic,
    });
    if (error) throw error;
  }
  async listPublic() {
    const { data } = await this.sb.from('wishes_public').select('*').order('created_at', { ascending: false });
    return data ?? [];
  }
}
