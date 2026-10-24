import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { relativeDay, sameMonth } from '../../core/dates';
import { FinanceStore } from '../../core/finance.store';
import { TAB_LABELS } from '../../core/models';
import { normalize } from '../../core/parse';
import { UiService } from '../../core/ui.service';
import { MoneyPipe, iconFor, methodIcon } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

const BAR_COLORS = ['bg-primary-container', 'bg-secondary', 'bg-outline', 'bg-secondary-fixed-dim'];

@Component({
  selector: 'app-gastos',
  imports: [FormsModule, MoneyPipe, MonthPicker],
  templateUrl: './gastos.html',
})
export class Gastos {
  protected readonly store = inject(FinanceStore);
  protected readonly tabs = TAB_LABELS;
  protected readonly ui = inject(UiService);
  protected readonly iconFor = iconFor;
  protected readonly methodIcon = methodIcon;
  protected readonly relativeDay = relativeDay;

  protected readonly query = signal('');
  protected readonly categoria = signal<string | null>(null);

  protected readonly total = computed(() => this.store.gastosMes().reduce((s, g) => s + g.monto, 0));

  protected readonly promedioDiario = computed(() => {
    const month = this.store.month();
    const today = new Date();
    const days = sameMonth(today, month)
      ? today.getDate()
      : new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    return this.total() / days;
  });

  protected readonly porCategoria = computed(() => {
    const map = new Map<string, number>();
    for (const g of this.store.gastosMes()) {
      const c = g.categoria || 'Otros';
      map.set(c, (map.get(c) ?? 0) + g.monto);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  });

  /** Barra apilada: top 3 categorías + "Otros". */
  protected readonly barra = computed(() => {
    const total = this.total() || 1;
    const cats = this.porCategoria();
    const top = cats.slice(0, 3).map(([name, value]) => ({ name, value }));
    const rest = cats.slice(3).reduce((s, [, v]) => s + v, 0);
    if (rest) top.push({ name: 'Otros', value: rest });
    return top.map((t, i) => ({ ...t, pct: Math.round((t.value / total) * 100), color: BAR_COLORS[i] }));
  });

  protected readonly lista = computed(() => {
    const q = normalize(this.query());
    const cat = this.categoria();
    return this.store
      .gastosMes()
      .filter((g) => !cat || (g.categoria || 'Otros') === cat)
      .filter((g) => !q || normalize(`${g.descripcion} ${g.detalle} ${g.categoria}`).includes(q));
  });

  protected hora(date: Date | null): string {
    const day = relativeDay(date);
    if (!date || (date.getHours() === 0 && date.getMinutes() === 0)) return day;
    return `${day} ${date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`;
  }
}
