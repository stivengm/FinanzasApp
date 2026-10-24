import { Component, computed, inject } from '@angular/core';
import { FinanceStore } from '../core/finance.store';
import { SessionService } from '../core/session.service';

/** Pill de estado: Sheets conectado / sincronizando / demo / error. */
@Component({
  selector: 'app-sync-pill',
  template: `
    <span class="inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-0.5" [class]="tone().bg">
      <span class="relative flex h-2 w-2">
        @if (tone().pulse) {
          <span class="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" [class]="tone().dot"></span>
        }
        <span class="relative inline-flex h-2 w-2 rounded-full" [class]="tone().dot"></span>
      </span>
      <span class="font-mono text-label-micro font-semibold tracking-wider uppercase" [class]="tone().text">{{ tone().label }}</span>
    </span>
  `,
})
export class SyncPill {
  private readonly store = inject(FinanceStore);
  private readonly session = inject(SessionService);

  protected readonly tone = computed(() => {
    if (this.store.loading())
      return { label: 'Sincronizando', bg: 'bg-primary-fixed/50', dot: 'bg-surface-tint', text: 'text-on-primary-fixed-variant', pulse: true };
    if (this.store.error())
      return { label: 'Sin conexión', bg: 'bg-error-container/60', dot: 'bg-error', text: 'text-error', pulse: false };
    if (this.session.isDemo())
      return { label: 'Modo demo', bg: 'bg-amber-100', dot: 'bg-amber-500', text: 'text-amber-800', pulse: false };
    return { label: 'Sheets conectado', bg: 'bg-secondary-container/30', dot: 'bg-secondary', text: 'text-secondary', pulse: true };
  });
}
