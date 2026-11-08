import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FinanceStore } from '../core/finance.store';
import { SessionService } from '../core/session.service';
import { UiService } from '../core/ui.service';
import { FormsHost } from '../forms/forms-host';
import { SyncPill } from '../shared/sync-pill';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, SyncPill, FormsHost],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly store = inject(FinanceStore);
  protected readonly ui = inject(UiService);
  protected readonly session = inject(SessionService);
  protected readonly menuAbierto = signal(false);

  protected readonly nav = [
    { path: '/inicio', icon: 'grid_view', label: 'Inicio' },
    { path: '/ingresos', icon: 'savings', label: 'Ingresos' },
    { path: '/fijos', icon: 'receipt_long', label: 'Fijos' },
    { path: '/gastos', icon: 'shopping_bag', label: 'Gastos' },
    { path: '/deudas', icon: 'account_balance', label: 'Deudas' },
    { path: '/sheets', icon: 'query_stats', label: 'Sheets' },
  ];

  /** Menú lateral: todas las secciones, incluidas las que no caben abajo. */
  protected readonly menu = [
    {
      grupo: 'Principal',
      items: [
        ...this.nav.slice(0, 5),
        { path: '/sheets', icon: 'query_stats', label: 'Estadísticas' },
      ],
    },
    {
      grupo: 'Análisis',
      items: [{ path: '/consulta', icon: 'manage_search', label: 'Consulta de varios meses' }],
    },
    {
      grupo: 'Cuenta',
      items: [{ path: '/perfil', icon: 'person', label: 'Mi perfil y salario' }],
    },
  ];

  protected readonly title = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => this.currentTitle()),
    ),
    { initialValue: this.currentTitle() },
  );

  protected readonly pendientes = computed(
    () => this.store.fijosMes().filter((f) => f.aplica && !f.pago).length,
  );

  constructor() {
    if (!this.store.lastSync()) this.store.load();
    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => this.menuAbierto.set(false));
  }

  @HostListener('document:keydown.escape')
  protected cerrarMenu(): void {
    this.menuAbierto.set(false);
  }

  protected salir(): void {
    this.menuAbierto.set(false);
    this.store.logout();
  }

  private currentTitle(): string {
    let r = this.route.snapshot;
    while (r.firstChild) r = r.firstChild;
    return (r.data['title'] as string) ?? '';
  }
}
