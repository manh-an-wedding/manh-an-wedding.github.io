import { DeviceIdService } from './device-id.service';

describe('DeviceIdService', () => {
  beforeEach(() => localStorage.clear());

  it('creates and persists a stable id', () => {
    const svc = new DeviceIdService();
    const first = svc.get();
    expect(first).toMatch(/^[0-9a-f-]{10,}$/);
    expect(new DeviceIdService().get()).toBe(first); // stable across instances
  });
});
