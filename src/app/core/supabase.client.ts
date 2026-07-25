import { InjectionToken } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { WEDDING } from '../../assets/config/wedding.config';

export const SUPABASE = new InjectionToken<SupabaseClient>('SUPABASE', {
  providedIn: 'root',
  factory: () => createClient(WEDDING.supabase.url, WEDDING.supabase.anonKey),
});
