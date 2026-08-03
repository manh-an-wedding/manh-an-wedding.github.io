import { Injectable, Inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE } from './supabase.client';
import { nameNorm } from './name-normalize';

export interface CompanionDraft { name: string; joinsBus?: boolean; relation?: string; }
export interface RsvpDraft {
  guestName: string; category: string;
  status: 'self_transport' | 'bus' | 'cannot_attend';
  phone?: string; companions: CompanionDraft[];
}

export interface RsvpEditHandle {
  rsvpId: number;
  editToken: string;
}

export type RsvpStatus = RsvpDraft['status'];

export interface PublicGroupRsvp {
  guest_name: string;
  status: RsvpStatus;
  companions: string[];
}

export interface AdminRsvpUpdate {
  sourceId: number;
  guestName: string;
  category: string;
  status: RsvpStatus;
  phone?: string;
  companions: CompanionDraft[];
}

export type DuplicateReviewStatus = 'pending' | 'confirmed' | 'rejected';

export interface AdminCompanion {
  id: number;
  name: string;
  joins_bus: boolean;
  relation: string | null;
}

export interface AdminRsvpRow {
  id: number;
  guest_name: string;
  name_norm: string;
  category: string;
  status: RsvpStatus;
  phone: string | null;
  party_size: number;
  created_at: string;
  superseded_by_id: number | null;
  duplicate_of_id: number | null;
  duplicate_status: DuplicateReviewStatus | null;
  invalidated_at: string | null;
  invalidated_by: string | null;
  invalid_reason: string | null;
  data_check: boolean;
  companions: AdminCompanion[];
}

export interface AdminDuplicateRow {
  candidate_id: number;
  candidate_guest_name: string;
  candidate_category: string;
  candidate_status: RsvpStatus;
  candidate_phone: string | null;
  candidate_party_size: number;
  candidate_created_at: string;
  target_id: number;
  target_guest_name: string;
  target_category: string;
  target_status: RsvpStatus;
  target_phone: string | null;
  target_party_size: number;
  target_created_at: string;
  candidate_duplicate_status: DuplicateReviewStatus;
  candidate_duplicate_reviewed_at: string | null;
  candidate_duplicate_reviewed_by: string | null;
}

export interface AdminSummary {
  rawRsvpCount: number;
  currentRsvpCount: number;
  attendingPeople: number;
  pendingDuplicateCount: number;
  busGuestSeats: number;
  busCompanionSeats: number;
}

export interface AdminDashboard {
  summary: AdminSummary;
  current: AdminRsvpRow[];
  history: AdminRsvpRow[];
  duplicates: AdminDuplicateRow[];
  busCurrent: AdminRsvpRow[];
  busHistory: AdminRsvpRow[];
  groups: string[];
}

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(@Inject(SUPABASE) private sb: SupabaseClient) {}

  async submit(d: RsvpDraft): Promise<RsvpEditHandle> {
    const editToken = this.createEditToken();
    const { data, error } = await this.sb.rpc('submit_rsvp', {
      p_guest_name: d.guestName,
      p_name_norm: nameNorm(d.guestName),
      p_category: d.category,
      p_status: d.status,
      p_phone: d.status === 'bus' ? (d.phone ?? null) : null,
      p_companions: d.companions,
      p_edit_token: editToken,
    });
    if (error) throw error;
    const rsvpId = Number(data);
    if (!Number.isSafeInteger(rsvpId) || rsvpId <= 0) {
      throw new Error('Invalid RSVP response');
    }
    return { rsvpId, editToken };
  }

  async update(handle: RsvpEditHandle, d: RsvpDraft): Promise<void> {
    const { error } = await this.sb.rpc('update_rsvp', {
      p_rsvp_id: handle.rsvpId,
      p_edit_token: handle.editToken,
      p_guest_name: d.guestName,
      p_name_norm: nameNorm(d.guestName),
      p_category: d.category,
      p_status: d.status,
      p_phone: d.status === 'bus' ? (d.phone ?? null) : null,
      p_companions: d.companions,
    });
    if (error) throw error;
  }

  async getPublicGroupRsvps(slug: string, token: string): Promise<PublicGroupRsvp[]> {
    const { data, error } = await this.sb.rpc('get_public_group_rsvps', {
      p_slug: slug,
      p_token: token,
    });
    if (error) throw error;
    return (data ?? []) as PublicGroupRsvp[];
  }

  async signInAdmin(email: string, password: string): Promise<void> {
    const { error: signInError } = await this.sb.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) throw signInError;

    const { data: isAdmin, error: adminError } = await this.sb.rpc(
      'is_rsvp_admin',
      {},
    );
    if (adminError) throw adminError;
    if (!isAdmin) {
      await this.sb.auth.signOut();
      throw new Error('Admin access required');
    }
  }

  async hasAdminSession(): Promise<boolean> {
    const { data, error } = await this.sb.auth.getSession();
    if (error) throw error;
    if (!data.session) return false;

    const { data: isAdmin, error: adminError } = await this.sb.rpc(
      'is_rsvp_admin',
      {},
    );
    if (adminError) throw adminError;
    return isAdmin === true;
  }

  async signOutAdmin(): Promise<void> {
    const { error } = await this.sb.auth.signOut();
    if (error) throw error;
  }

  async getAdminDashboard(): Promise<AdminDashboard> {
    const { data, error } = await this.sb.rpc('get_admin_rsvp_dashboard', {});
    if (error) throw error;
    return data as AdminDashboard;
  }

  async updateAdminRsvp(d: AdminRsvpUpdate): Promise<number> {
    const { data, error } = await this.sb.rpc('admin_update_rsvp', {
      p_source_id: d.sourceId,
      p_guest_name: d.guestName,
      p_category: d.category,
      p_status: d.status,
      p_phone: d.status === 'bus' ? (d.phone ?? null) : null,
      p_companions: d.companions,
    });
    if (error) throw error;
    return data as number;
  }

  async setRsvpDataCheck(rsvpId: number, checked: boolean): Promise<void> {
    const { error } = await this.sb.rpc('admin_set_rsvp_data_check', {
      p_rsvp_id: rsvpId,
      p_data_check: checked,
    });
    if (error) throw error;
  }

  async reviewDuplicate(
    candidateId: number,
    targetId: number,
    status: DuplicateReviewStatus,
  ): Promise<void> {
    const { error } = await this.sb.rpc('admin_review_rsvp_duplicate', {
      p_candidate_id: candidateId,
      p_target_id: targetId,
      p_status: status,
    });
    if (error) throw error;
  }

  async setRsvpInvalidated(
    rsvpId: number,
    invalidated: boolean,
    reason?: string,
  ): Promise<void> {
    const { error } = await this.sb.rpc('admin_set_rsvp_invalidated', {
      p_rsvp_id: rsvpId,
      p_invalidated: invalidated,
      p_reason: invalidated ? (reason?.trim() || null) : null,
    });
    if (error) throw error;
  }

  private createEditToken(): string {
    const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
    return Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  }
}
