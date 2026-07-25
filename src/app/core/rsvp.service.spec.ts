import { RsvpService, RsvpDraft } from './rsvp.service';

function fakeSupabase(existing: any[] = []) {
  const inserted: any[] = [];
  return {
    inserted,
    from(table: string) {
      return {
        insert: (rows: any) => { inserted.push({ table, rows });
          return { select: () => ({ single: async () => ({ data: { id: 99 }, error: null }) }) }; },
        select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({
          data: existing, error: null }) }) }) }),
      } as any;
    },
  } as any;
}

const draft: RsvpDraft = {
  guestName: 'Duy Mạnh', category: 'IAS', status: 'bus', phone: '0900',
  companions: [{ name: 'Vợ', joinsBus: true }], deviceId: 'dev-1',
};

describe('RsvpService', () => {
  it('normalizes name and inserts rsvp + companions with party_size', async () => {
    const sb = fakeSupabase();
    const svc = new RsvpService(sb);
    await svc.submit(draft);
    const rsvpRow = sb.inserted.find((i: any) => i.table === 'rsvp').rows;
    expect(rsvpRow.name_norm).toBe('duy manh');
    expect(rsvpRow.party_size).toBe(2); // guest + 1 companion
    expect(sb.inserted.some((i: any) => i.table === 'companions')).toBe(true);
  });

  it('flags a clash: same name+group+status, different device_id', async () => {
    const sb = fakeSupabase([{ device_id: 'other-dev', ip: '1.1.1.1' }]);
    const svc = new RsvpService(sb);
    const clash = await svc.checkClash(draft);
    expect(clash).toBe(true);
  });

  it('no clash when same device_id', async () => {
    const sb = fakeSupabase([{ device_id: 'dev-1', ip: '1.1.1.1' }]);
    const svc = new RsvpService(sb);
    expect(await svc.checkClash(draft)).toBe(false);
  });
});
