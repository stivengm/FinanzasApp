import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { SessionService } from './core/session.service';
import { Shell } from './layout/shell';

const requireSession: CanActivateFn = () =>
  inject(SessionService).activa() || inject(Router).parseUrl('/ingresar');

const onlyGuest: CanActivateFn = () =>
  !inject(SessionService).activa() || inject(Router).parseUrl('/inicio');

export const routes: Routes = [
  {
    path: 'ingresar',
    canActivate: [onlyGuest],
    loadComponent: () => import('./pages/ingresar/ingresar').then((m) => m.Ingresar),
  },
  {
    path: '',
    component: Shell,
    canActivate: [requireSession],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', data: { title: 'Inicio' }, loadComponent: () => import('./pages/inicio/inicio').then((m) => m.Inicio) },
      { path: 'ingresos', data: { title: 'Ingresos' }, loadComponent: () => import('./pages/ingresos/ingresos').then((m) => m.Ingresos) },
      { path: 'fijos', data: { title: 'Fijos' }, loadComponent: () => import('./pages/fijos/fijos').then((m) => m.Fijos) },
      { path: 'gastos', data: { title: 'Gastos' }, loadComponent: () => import('./pages/gastos/gastos').then((m) => m.Gastos) },
      { path: 'sheets', data: { title: 'Estadísticas' }, loadComponent: () => import('./pages/sheets/sheets').then((m) => m.Sheets) },
      { path: 'perfil', data: { title: 'Perfil' }, loadComponent: () => import('./pages/perfil/perfil').then((m) => m.PerfilPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
