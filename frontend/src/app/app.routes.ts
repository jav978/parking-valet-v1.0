import { Routes } from '@angular/router';
import { authGuard, loginGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    canActivate: [loginGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login').then((m) => m.Login),
      },
      { path: '**', redirectTo: 'login' },
    ],
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/layout').then((m) => m.Layout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
      },
      {
        path: 'usuarios',
        loadComponent: () => import('./features/usuarios/usuarios').then((m) => m.Usuarios),
      },
      {
        path: 'roles',
        loadComponent: () => import('./features/roles/roles').then((m) => m.Roles),
      },
      {
        path: 'permisos',
        loadComponent: () => import('./features/permisos/permisos').then((m) => m.Permisos),
      },
      {
        path: 'tickets',
        loadComponent: () => import('./features/tickets/tickets').then((m) => m.Tickets),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
