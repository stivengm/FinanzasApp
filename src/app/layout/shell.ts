import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { FinanceStore } from '../core/finance.store';
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

  protected readonly nav = [
    { path: '/inicio', icon: 'grid_view', label: 'Inicio' },
    { path: '/ingresos', icon: 'savings', label: 'Ingresos' },
    { path: '/fijos', icon: 'receipt_long', label: 'Fijos' },
    { path: '/gastos', icon: 'shopping_bag', label: 'Gastos' },
    { path: '/sheets', icon: 'query_stats', label: 'Sheets' },
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
  }

  private currentTitle(): string {
    let r = this.route.snapshot;
    while (r.firstChild) r = r.firstChild;
    return (r.data['title'] as string) ?? '';
  }
}
