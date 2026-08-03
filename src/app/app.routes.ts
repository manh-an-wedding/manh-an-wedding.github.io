import { Routes } from '@angular/router';
import { InviteComponent } from './pages/invite/invite.component';

export const routes: Routes = [
  { path: '', component: InviteComponent, data: { lang: 'vi' } },
  { path: 'en', component: InviteComponent, data: { lang: 'en' } },
  {
    path: 'view/:slug',
    loadComponent: () => import('./pages/public-group/public-group.component')
      .then(module => module.PublicGroupComponent),
    data: { readOnly: true },
  },
  {
    path: 'admin',
    loadComponent: () => import('./pages/admin/admin.component')
      .then(module => module.AdminComponent),
    data: { requiresAdmin: true },
  },
  { path: '**', redirectTo: '' },
];
