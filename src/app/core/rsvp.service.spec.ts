import { RsvpService, RsvpDraft } from './rsvp.service';

function fakeSupabase(responses: Record<string, { data: unknown; error: unknown }> = {}) {
  const calls: { functionName: string; args: Record<string, unknown> }[] = [];
  return {
    calls,
    async rpc(functionName: string, args: Record<string, unknown>) {
      calls.push({ functionName, args });
      return responses[functionName] ?? { data: true, error: null };
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
});
