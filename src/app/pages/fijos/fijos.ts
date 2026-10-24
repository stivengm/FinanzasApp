import { Component, computed, inject, signal } from '@angular/core';
import { monthName } from '../../core/dates';
import { FinanceStore } from '../../core/finance.store';
import { FijoMes, TAB_LABELS } from '../../core/models';
import { UiService } from '../../core/ui.service';
import { MoneyPipe, iconFor } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

type Filtro = 'todos' | 'pendientes' | 'pagados';

const TINTS = [
  'bg-tertiary-fixed/60 text-on-tertiary-fixed',
  'bg-secondary-container/40 text-secondary',
  'bg-primary-fixed text-on-primary-fixed',
  'bg-surface-container text-on-surface-variant',
];

@Component({
  selector: 'app-fijos',
  imports: [MoneyPipe, MonthPicker],
  templateUrl: './fijos.html',
})
export class Fijos {
  protected readonly store = inject(FinanceStore);
  protected readonly ui = inject(UiService);
  protected readonly iconFor = iconFor;
  protected readonly monthName = monthName;
  protected readonly tabs = TAB_LABELS;

  protected readonly filtro = signal<Filtro>('todos');
  protected readonly marcando = signal<number | null>(null);

  private readonly aplican = computed(() => this.store.fijosMes().filter((f) => f.aplica));

  protected readonly resumen = computed(() => {
    const aplican = this.aplican();
    const pagados = aplican.filter((f) => f.pago);
    const pendientes = aplican.filter((f) => !f.pago);
    const sumPagados = pagados.reduce((s, f) => s + f.pago!.monto, 0);
    const sumPendientes = pendientes.reduce((s, f) => s + f.fijo.monto, 0);
    const total = sumPagados + sumPendientes;
    return {
      total,
      pagados: pagados.length,
      pendientes: pendientes.length,
      sumPagados,
      sumPendientes,
      cobertura: total ? Math.round((sumPagados / total) * 100) : 0,
    };
  });

  protected readonly segmentos = computed((): { key: Filtro; label: string; count: number }[] => [
    { key: 'todos', label: 'Todos', count: this.store.fijosMes().length },
    { key: 'pendientes', label: 'Pendientes', count: this.resumen().pendientes },
    { key: 'pagados', label: 'Pagados', count: this.resumen().pagados },
  ]);

  protected readonly lista = computed(() => {
    const f = this.filtro();
    return this.store
      .fijosMes()
      .filter((x) => (f === 'todos' ? true : f === 'pagados' ? !!x.pago : x.aplica && !x.pago))
      .sort((a, b) => Number(!!a.pago) - Number(!!b.pago) || Number(!a.aplica) - Number(!b.aplica) || a.vence.getTime() - b.vence.getTime());
  });

  protected tint(item: FijoMes, i: number): string {
    if (item.pago) return TINTS[1];
    if (!item.aplica) return TINTS[3];
    return i % 2 ? TINTS[2] : TINTS[0];
  }

  protected fecha(date: Date): string {
    return `${date.getDate()} ${monthName(date, true)}`;
  }

  protected async marcar(item: FijoMes): Promise<void> {
    this.marcando.set(item.fijo.row);
    try {
      await this.store.marcarPagado(item);
      this.ui.notify(`${item.fijo.servicio} marcado como pagado`);
    } catch (e) {
      this.ui.notify((e as Error).message, true);
    } finally {
      this.marcando.set(null);
    }
  }
}
