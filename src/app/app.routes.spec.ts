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

  it('/view/:slug opens the read-only public group page', () => {
    const publicGroup = routes.find(r => r.path === 'view/:slug');
    expect(publicGroup?.loadComponent).toBeDefined();
    expect(publicGroup?.component).toBeUndefined();
    expect(publicGroup?.data?.['readOnly']).toBe(true);
  });

  it('/admin opens the authenticated management page', () => {
    const admin = routes.find(r => r.path === 'admin');
    expect(admin?.loadComponent).toBeDefined();
    expect(admin?.component).toBeUndefined();
    expect(admin?.data?.['requiresAdmin']).toBe(true);
  });
});
