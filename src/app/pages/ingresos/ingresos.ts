import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { monthName } from '../../core/dates';
import { FinanceStore, esPrima } from '../../core/finance.store';
import { TAB_LABELS } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { MoneyPipe, iconFor } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

@Component({
  selector: 'app-ingresos',
  imports: [RouterLink, MoneyPipe, MonthPicker],
  templateUrl: './ingresos.html',
})
export class Ingresos {
  protected readonly store = inject(FinanceStore);
  protected readonly ui = inject(UiService);
  protected readonly iconFor = iconFor;
  protected readonly tabs = TAB_LABELS;
  protected readonly mesNombre = computed(() => monthName(this.store.month()));

  protected readonly total = computed(() => this.store.summary().ingresos);
  protected readonly trend = computed(() => {
    const prev = this.store.previousSummary().ingresos;
    return prev ? ((this.total() - prev) / prev) * 100 : null;
  });

  /** Ingresos registrados en el mes (sin el salario, que viene del perfil). */
  protected readonly extras = computed(() =>
    this.store
      .ingresosMes()
      .filter((i) => i.row > 0)
      .map((i) => ({
        ...i,
        prima: esPrima(i),
        fechaTexto: i.fecha?.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) ?? '',
      }))
      .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0)),
  );

  protected readonly flujo = computed(() => {
    const total = this.total() || 1;
    const prima = this.extras().filter((e) => e.prima).reduce((s, e) => s + e.monto, 0);
    const extras = this.extras().reduce((s, e) => s + e.monto, 0) - prima;
    return {
      salario: (this.store.salarioDesglose().neto / total) * 100,
      prima: (prima / total) * 100,
      extras: (extras / total) * 100,
    };
  });

  protected readonly ahorro = computed(() => {
    const programado = this.store.metas().reduce((s, m) => s + m.aporteMensual, 0);
    const pct = this.total() ? (programado / this.total()) * 100 : 0;
    return { programado, pct, remanente: this.total() - programado };
  });

  protected readonly metas = computed(() =>
    this.store.metas().map((m) => ({
      ...m,
      pct: m.meta ? Math.min(100, Math.round((m.ahorrado / m.meta) * 100)) : 0,
      resta: Math.max(0, m.meta - m.ahorrado),
    })),
  );
}
