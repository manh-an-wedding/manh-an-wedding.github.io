import { Routes } from '@angular/router';
import { InviteComponent } from './pages/invite/invite.component';

export const routes: Routes = [
  { path: '', component: InviteComponent, data: { lang: 'vi' } },
  { path: 'en', component: InviteComponent, data: { lang: 'en' } },
  { path: '**', redirectTo: '' },
];
