import { RsvpService, RsvpDraft } from './rsvp.service';

function fakeSupabase(responses: Record<string, { data: unknown; error: unknown }> = {}) {
  const calls: { functionName: string; args: Record<string, unknown> }[] = [];
  const authCalls: { method: string; args?: unknown }[] = [];
  return {
    calls,
    authCalls,
    async rpc(functionName: string, args: Record<string, unknown>) {
      calls.push({ functionName, args });
      return responses[functionName] ?? { data: true, error: null };
    },
    auth: {
      async signInWithPassword(args: unknown) {
        authCalls.push({ method: 'signInWithPassword', args });
        return responses['signInWithPassword'] ?? {
          data: { session: { access_token: 'admin-token' } }, error: null,
        };
      },
      async signOut() {
        authCalls.push({ method: 'signOut' });
        return responses['signOut'] ?? { error: null };
      },
      async getSession() {
        authCalls.push({ method: 'getSession' });
        return responses['getSession'] ?? {
          data: { session: { access_token: 'admin-token' } }, error: null,
        };
      },
    },
  } as any;
}

const draft: RsvpDraft = {
  guestName: 'Duy Mạnh', category: 'IAS', status: 'bus', phone: '0900',
  companions: [{ name: 'Vợ', joinsBus: true, relation: '' }], deviceId: 'dev-1',
};

describe('RsvpService', () => {
  it('submits the normalized RSVP and companions through the protected RPC', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);
    await svc.submit(draft);
    expect(sb.calls).toEqual([{
      functionName: 'submit_rsvp',
      args: {
        p_guest_name: 'Duy Mạnh',
        p_name_norm: 'duy manh',
        p_category: 'IAS',
        p_status: 'bus',
        p_phone: '0900',
        p_companions: [{ name: 'Vợ', joinsBus: true, relation: '' }],
        p_device_id: 'dev-1',
      },
    }]);
  });

  it('propagates an RPC failure to the form', async () => {
    const error = new Error('permission denied');
    const sb = fakeSupabase({ submit_rsvp: { data: null, error } });
    const svc = new RsvpService(sb);
    await expect(svc.submit(draft)).rejects.toBe(error);
  });

  it('returns only the safe public group RSVP fields from the slug RPC', async () => {
    const rows = [{
      guest_name: 'An', status: 'bus', companions: ['Binh'],
    }];
    const sb = fakeSupabase({
      get_public_group_rsvps: { data: rows, error: null },
    });
    const svc = new RsvpService(sb);

    const result = await (svc as any).getPublicGroupRsvps('tien-buoc');

    expect(result).toEqual(rows);
    expect(sb.calls).toEqual([{
      functionName: 'get_public_group_rsvps',
      args: { p_slug: 'tien-buoc' },
    }]);
  });

  it('signs in only when the authenticated account is allowlisted as an admin', async () => {
    const sb = fakeSupabase({
      is_rsvp_admin: { data: true, error: null },
    });
    const svc = new RsvpService(sb);

    await (svc as any).signInAdmin('owner@example.com', 'secret');

    expect(sb.authCalls[0]).toEqual({
      method: 'signInWithPassword',
      args: { email: 'owner@example.com', password: 'secret' },
    });
    expect(sb.calls).toContainEqual({
      functionName: 'is_rsvp_admin', args: {},
    });
  });

  it('signs out a valid account that is not on the admin allowlist', async () => {
    const sb = fakeSupabase({
      is_rsvp_admin: { data: false, error: null },
    });
    const svc = new RsvpService(sb);

    await expect(
      (svc as any).signInAdmin('guest@example.com', 'secret'),
    ).rejects.toThrow('Admin access required');

    expect(sb.authCalls.at(-1)).toEqual({ method: 'signOut' });
  });

  it('updates an RSVP in place with the complete admin payload', async () => {
    const sb = fakeSupabase({
      admin_update_rsvp: { data: 12, error: null },
    });
    const svc = new RsvpService(sb);
    const revision = {
      sourceId: 12,
      guestName: 'Nhật An',
      category: 'Tiến bước',
      status: 'self_transport',
      phone: '',
      companions: [{ name: 'Bạn đi cùng', joinsBus: false, relation: '' }],
    };

    const result = await (svc as any).updateAdminRsvp(revision);

    expect(result).toBe(12);
    expect(sb.calls).toEqual([{
      functionName: 'admin_update_rsvp',
      args: {
        p_source_id: 12,
        p_guest_name: 'Nhật An',
        p_category: 'Tiến bước',
        p_status: 'self_transport',
        p_phone: null,
        p_companions: revision.companions,
      },
    }]);
  });

  it('marks a raw RSVP as checked without exposing direct table writes', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);

    await (svc as any).setRsvpDataCheck(21, true);

    expect(sb.calls).toEqual([{
      functionName: 'admin_set_rsvp_data_check',
      args: { p_rsvp_id: 21, p_data_check: true },
    }]);
  });

  it('reviews a duplicate candidate without deleting RSVP history', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);

    await (svc as any).reviewDuplicate(7, 11, 'confirmed');

    expect(sb.calls).toEqual([{
      functionName: 'admin_review_rsvp_duplicate',
      args: { p_candidate_id: 7, p_target_id: 11, p_status: 'confirmed' },
    }]);
  });

  it('restores an allowlisted admin session and loads the complete dashboard', async () => {
    const dashboard = {
      summary: { currentRsvpCount: 3 },
      current: [], history: [], duplicates: [],
      busCurrent: [], busHistory: [], groups: ['Tiến bước'],
    };
    const sb = fakeSupabase({
      is_rsvp_admin: { data: true, error: null },
      get_admin_rsvp_dashboard: { data: dashboard, error: null },
    });
    const svc = new RsvpService(sb);

    expect(await (svc as any).hasAdminSession()).toBe(true);
    expect(await (svc as any).getAdminDashboard()).toEqual(dashboard);
  });

  it('returns no admin session when Supabase has no authenticated user', async () => {
    const sb = fakeSupabase({
      getSession: { data: { session: null }, error: null },
    });
    const svc = new RsvpService(sb);

    expect(await (svc as any).hasAdminSession()).toBe(false);
    expect(sb.calls).toEqual([]);
  });

  it('signs the admin out through Supabase Auth', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);

    await (svc as any).signOutAdmin();

    expect(sb.authCalls).toEqual([{ method: 'signOut' }]);
  });
});
