import { Component, computed, inject, signal } from '@angular/core';
import { toIsoDate } from '../../core/dates';
import { EstadoDeuda } from '../../core/deudas';
import { FinanceStore } from '../../core/finance.store';
import { TAB_LABELS } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { MoneyPipe } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

@Component({
  selector: 'app-deudas',
  imports: [MoneyPipe, MonthPicker],
  templateUrl: './deudas.html',
})
export class Deudas {
  protected readonly store = inject(FinanceStore);
  protected readonly ui = inject(UiService);
  protected readonly tabs = TAB_LABELS;

  /** Deudas con el historial abierto. */
  protected readonly abiertas = signal<ReadonlySet<string>>(new Set());

  protected readonly r = this.store.resumenDeudas;
  protected readonly progreso = computed(() => {
    const { prestado, capitalPagado } = this.r();
    return prestado ? Math.min(100, Math.round((capitalPagado / prestado) * 100)) : 0;
  });

  /** Activas primero (mayor saldo arriba), pagadas al final. */
  protected readonly lista = computed(() =>
    [...this.store.estadosDeuda()].sort((a, b) => Number(a.pagada) - Number(b.pagada) || b.saldo - a.saldo),
  );

  protected pct(e: EstadoDeuda): number {
    return e.deuda.monto ? Math.min(100, Math.round((e.capitalPagado / e.deuda.monto) * 100)) : 0;
  }

  protected tasa(e: EstadoDeuda): string {
    const t = e.deuda.tasaMensual;
    return t > 0 ? `${t.toLocaleString('es-CO', { maximumFractionDigits: 2 })}% mensual` : 'Sin interés';
  }

  protected fecha(d: Date | null): string {
    return d ? d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Sin fecha';
  }

  /** Con una sola deuda activa la preselecciona; con varias, deja elegir. */
  protected registrarPago(): void {
    const activas = this.store.estadosDeuda().filter((e) => !e.pagada);
    if (activas.length === 1) return this.ui.openAbono(activas[0].deuda);
    this.ui.open('abono', { deudaId: '', tipo: 'Cuota', monto: null, fecha: toIsoDate(new Date()), nota: '' });
  }

  protected toggle(id: string): void {
    this.abiertas.update((set) => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }
}
