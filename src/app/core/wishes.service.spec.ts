import { WishesService } from './wishes.service';

describe('WishesService', () => {
  it('submits wishes through the bounded RPC instead of direct table insert', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const supabase = {
      rpc: async (name: string, args: Record<string, unknown>) => {
        calls.push({ name, args });
        return { error: null };
      },
    } as any;
    const service = new WishesService(supabase);

    await service.add({
      name: 'An',
      message: 'Chúc mừng',
      isPublic: true,
      deviceId: 'device-1',
    });

    expect(calls).toEqual([{
      name: 'submit_wish',
      args: {
        p_name: 'An',
        p_message: 'Chúc mừng',
        p_is_public: true,
        p_device_id: 'device-1',
      },
    }]);
  });
});
