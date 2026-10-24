import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { daysUntil, relativeDay, sameMonth } from '../../core/dates';
import { FinanceStore } from '../../core/finance.store';
import { SessionService } from '../../core/session.service';
import { UiService, timeAgo } from '../../core/ui.service';
import { MoneyPipe, iconFor } from '../../shared/format';
import { MonthPicker } from '../../shared/month-picker';

@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MoneyPipe, MonthPicker],
  templateUrl: './inicio.html',
})
export class Inicio {
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  protected readonly ui = inject(UiService);
  protected readonly iconFor = iconFor;
  protected readonly relativeDay = relativeDay;

  protected readonly nombre = computed(() => this.store.perfil()?.nombre || '');
  protected readonly syncAgo = computed(() => timeAgo(this.store.lastSync(), this.ui.now()));
  protected readonly s = this.store.summary;

  /** % del ingreso que queda libre: alimenta la tarjeta de "hábito". */
  protected readonly habito = computed(() => {
    const { ingresos, balance, gastos } = this.s();
    if (!ingresos) return null;
    const libre = Math.round((balance / ingresos) * 100);
    if (balance < 0)
      return { tone: 'error', icon: 'warning', tag: 'Alerta de flujo', title: 'Gastos por encima del ingreso', text: `Este mes vas ${Math.abs(libre)}% por encima de tus ingresos. Revisa gastos variables.` };
    if (gastos / ingresos > 0.8)
      return { tone: 'amber', icon: 'speed', tag: 'Atención', title: 'Ritmo de gasto alto', text: `Has usado el ${Math.round((gastos / ingresos) * 100)}% de tus ingresos del mes.` };
    return { tone: 'ok', icon: 'auto_awesome', tag: 'Hábito saludable', title: 'Excelente ritmo de gasto', text: `Conservas el ${libre}% de tus ingresos libres este mes.` };
  });

  protected readonly vencimientos = computed(() => {
    const esActual = sameMonth(new Date(), this.store.month());
    return this.store
      .fijosMes()
      .filter((f) => f.aplica && !f.pago)
      .sort((a, b) => a.vence.getTime() - b.vence.getTime())
      .slice(0, 3)
      .map((f) => {
        const dias = daysUntil(f.vence);
        const texto = !esActual ? `Vence el ${f.vence.getDate()}` : dias < 0 ? `Vencido hace ${-dias} d` : dias === 0 ? 'Vence hoy' : `Vence en ${dias} días`;
        return { ...f, dias, texto, urgente: esActual && dias <= 3 };
      });
  });

  protected readonly ultimos = computed(() => this.store.movimientos().slice(0, 4));
}
