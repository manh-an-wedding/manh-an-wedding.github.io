import { routes } from './app.routes';

describe('routes (Option C)', () => {
  it('root path is Vietnamese (no redirect, no prefix)', () => {
    const root = routes.find(r => r.path === '');
    expect(root?.data?.['lang']).toBe('vi');
    expect(root?.redirectTo).toBeUndefined();
  });
  it('/en path is English', () => {
    const en = routes.find(r => r.path === 'en');
    expect(en?.data?.['lang']).toBe('en');
  });
});
