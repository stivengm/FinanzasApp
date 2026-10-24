import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { addMonths, monthName } from '../../core/dates';
import { FinanceStore } from '../../core/finance.store';
import { TAB_LABELS, TabKey } from '../../core/models';
import { normalize } from '../../core/parse';
import { SessionService } from '../../core/session.service';
import { UiService, timeAgo } from '../../core/ui.service';
import { MoneyPipe, ShortMoneyPipe } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

const RADIUS = 52;
const CIRC = 2 * Math.PI * RADIUS;

@Component({
  selector: 'app-sheets',
  imports: [RouterLink, MoneyPipe, ShortMoneyPipe, MonthPicker],
  templateUrl: './sheets.html',
})
export class Sheets {
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  protected readonly ui = inject(UiService);
  protected readonly radius = RADIUS;

  protected readonly s = this.store.summary;
  protected readonly syncAgo = computed(() => timeAgo(this.store.lastSync(), this.ui.now()));

  protected readonly tasaAhorro = computed(() => {
    const rate = (x: { ahorro: number; ingresos: number }) => (x.ingresos ? (x.ahorro / x.ingresos) * 100 : 0);
    const actual = rate(this.s());
    const prev = rate(this.store.previousSummary());
    const label = actual >= 20 ? 'Óptimo' : actual >= 10 ? 'Bueno' : 'Bajo';
    return { actual, delta: actual - prev, label, prevMonth: monthName(addMonths(this.store.month(), -1)) };
  });

  protected readonly margen = computed(() => {
    const { balance, ingresos } = this.s();
    return { balance, pct: ingresos ? (balance / ingresos) * 100 : 0 };
  });

  protected readonly distribucion = computed(() => {
    const tarjetas = this.store
      .gastosMes()
      .filter((g) => normalize(g.categoria).includes('tarjeta'))
      .reduce((sum, g) => sum + g.monto, 0);
    const { fijos, variables, ahorro } = this.s();
    const items = [
      { label: 'Responsabilidades fijas', hint: 'Servicios, vivienda, seguros', value: fijos, color: '#0f1c2c', text: 'text-on-surface' },
      { label: 'Gastos variables y ocio', hint: 'Restaurantes, compras, eventos', value: variables - tarjetas, color: '#ba1a1a', text: 'text-error' },
      { label: 'Ahorro e inversión', hint: 'Aportes a tus objetivos', value: ahorro, color: '#006c49', text: 'text-secondary' },
      { label: 'Pago tarjetas y otros', hint: 'Cuotas, intereses', value: tarjetas, color: '#74777d', text: 'text-on-surface-variant' },
    ];
    const total = items.reduce((sum, i) => sum + i.value, 0);
    let offset = 0;
    return {
      total,
      items: items.map((i) => {
        const pct = total ? (i.value / total) * 100 : 0;
        const seg = { ...i, pct, dash: `${(pct / 100) * CIRC} ${CIRC}`, offset: -offset };
        offset += (pct / 100) * CIRC;
        return seg;
      }),
    };
  });

  protected readonly trimestre = computed(() => {
    const months = [-2, -1, 0].map((d) => this.store.summaryFor(addMonths(this.store.month(), d)));
    const max = Math.max(1, ...months.flatMap((m) => [m.ingresos, m.gastos]));
    return months.map((m, i) => ({
      label: monthName(m.month, true),
      ingresos: m.ingresos,
      gastos: m.gastos,
      hIng: (m.ingresos / max) * 100,
      hGas: (m.gastos / max) * 100,
      actual: i === 2,
      superavit: m.ingresos >= m.gastos,
    }));
  });

  protected readonly pestanas = (Object.keys(TAB_LABELS) as TabKey[]).map((key) => ({ key, name: TAB_LABELS[key] }));

  protected async sync(): Promise<void> {
    await this.store.load();
    if (!this.store.error()) this.ui.notify('Datos actualizados desde Google Sheets');
  }
}
