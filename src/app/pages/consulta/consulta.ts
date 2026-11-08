import { Component, computed, inject, signal } from '@angular/core';
import { addMonths, endOfMonth, monthLabel, monthName, monthsBetween, startOfMonth, toIsoDate } from '../../core/dates';
import { FinanceStore, MonthSummary, esPrima, esSalario } from '../../core/finance.store';
import { SessionService } from '../../core/session.service';
import { UiService } from '../../core/ui.service';
import { NgTemplateOutlet } from '@angular/common';
import { MoneyPipe, ShortMoneyPipe, iconFor } from '../../shared/format';

/** Máximo de meses que se pueden consultar a la vez. */
export const MAX_MESES = 36;

/** Paleta validada (CVD ≥ 8) para la composición de egresos. */
const COLORES = { fijos: '#2f5fb3', variables: '#d9822b', deudas: '#9b59b6', ahorro: '#0f8a5f' } as const;
type Parte = keyof typeof COLORES;
const PARTES: { key: Parte; label: string }[] = [
  { key: 'fijos', label: 'Fijos' },
  { key: 'variables', label: 'Variables' },
  { key: 'deudas', label: 'Deudas' },
  { key: 'ahorro', label: 'Ahorro' },
];

type TipoMov = 'ingreso' | 'gasto' | 'fijo' | 'deuda';
interface MovConsulta {
  clave: string;
  tipo: TipoMov;
  fecha: Date;
  titulo: string;
  etiqueta: string;
  monto: number;
}

const FILTROS: { key: TipoMov | 'todos'; label: string }[] = [
  { key: 'todos', label: 'Todos' },
  { key: 'ingreso', label: 'Ingresos' },
  { key: 'gasto', label: 'Gastos' },
  { key: 'fijo', label: 'Fijos' },
  { key: 'deuda', label: 'Deudas' },
];

function aMes(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, 1) : null;
}

function valorMes(date: Date): string {
  return toIsoDate(date).slice(0, 7);
}

function agrupar<T>(items: T[], key: (t: T) => string, value: (t: T) => number): { nombre: string; total: number; pct: number }[] {
  const map = new Map<string, number>();
  for (const it of items) map.set(key(it), (map.get(key(it)) ?? 0) + value(it));
  const lista = [...map.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...lista.map(([, v]) => v));
  return lista.map(([nombre, total]) => ({ nombre, total, pct: (total / max) * 100 }));
}

@Component({
  selector: 'app-consulta',
  imports: [MoneyPipe, ShortMoneyPipe, NgTemplateOutlet],
  templateUrl: './consulta.html',
})
export class Consulta {
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  private readonly ui = inject(UiService);
  protected readonly colores = COLORES;
  protected readonly partes = PARTES;
  protected readonly filtros = FILTROS;
  protected readonly iconFor = iconFor;
  protected readonly monthLabel = monthLabel;

  private readonly hoy = startOfMonth(new Date());
  protected readonly desde = signal(addMonths(this.hoy, -5));
  protected readonly hasta = signal(this.hoy);
  protected readonly hover = signal<number | null>(null);
  protected readonly filtro = signal<TipoMov | 'todos'>('todos');
  protected readonly verTodos = signal(false);

  /** Correo de la cuenta consultada: los datos llegan filtrados por este usuario desde la hoja. */
  protected readonly cuenta = computed(() =>
    this.session.isDemo() ? 'Modo demo' : (this.store.perfil()?.usuario ?? this.session.sesion()?.usuario ?? ''),
  );

  protected readonly desdeValor = computed(() => valorMes(this.desde()));
  protected readonly hastaValor = computed(() => valorMes(this.hasta()));

  protected readonly presets = [
    { label: 'Últimos 3 meses', desde: -2 },
    { label: '6 meses', desde: -5 },
    { label: '12 meses', desde: -11 },
    { label: 'Este año', desde: -this.hoy.getMonth() },
  ];

  protected readonly meses = computed(() => {
    const n = Math.min(monthsBetween(this.desde(), this.hasta()), MAX_MESES - 1);
    return Array.from({ length: n + 1 }, (_, i) => addMonths(this.desde(), i));
  });

  private readonly limites = computed(() => ({ ini: this.desde(), fin: endOfMonth(this.meses().at(-1)!) }));

  protected readonly resumenes = computed<MonthSummary[]>(() => this.meses().map((m) => this.store.summaryFor(m)));

  protected readonly totales = computed(() => {
    const r = this.resumenes();
    const sum = (k: keyof Omit<MonthSummary, 'month'>) => r.reduce((s, x) => s + x[k], 0);
    const ingresos = sum('ingresos');
    const egresos = sum('gastos');
    const ahorro = sum('ahorro');
    const balance = sum('balance');
    const deficit = r.filter((x) => x.balance < 0).length;
    return {
      ingresos,
      egresos,
      ahorro,
      balance,
      fijos: sum('fijos'),
      variables: sum('variables'),
      deudas: sum('deudas'),
      promIngresos: ingresos / r.length,
      promEgresos: egresos / r.length,
      tasaAhorro: ingresos ? (ahorro / ingresos) * 100 : 0,
      deficit,
    };
  });

  /** Ingresos vs egresos por mes (barras agrupadas, un solo eje en pesos). */
  protected readonly evolucion = computed(() => {
    const r = this.resumenes();
    const max = Math.max(1, ...r.flatMap((m) => [m.ingresos, m.gastos]));
    return r.map((m) => ({
      mes: m.month,
      label: monthName(m.month, true),
      anio: m.month.getFullYear(),
      ingresos: m.ingresos,
      egresos: m.gastos,
      balance: m.balance,
      hIng: (m.ingresos / max) * 100,
      hEgr: (m.gastos / max) * 100,
    }));
  });

  /** Composición de egresos por mes (barras apiladas). */
  protected readonly composicion = computed(() => {
    const r = this.resumenes();
    const max = Math.max(1, ...r.map((m) => m.fijos + m.variables + m.deudas + m.ahorro));
    return r.map((m) => ({
      label: monthName(m.month, true),
      total: m.fijos + m.variables + m.deudas + m.ahorro,
      segs: PARTES.map((p) => ({ ...p, value: m[p.key], h: (m[p.key] / max) * 100 })).filter((s) => s.value > 0),
    }));
  });

  protected readonly composicionTotal = computed(() => {
    const t = this.totales();
    const total = t.fijos + t.variables + t.deudas + t.ahorro;
    return PARTES.map((p) => ({ ...p, value: t[p.key], pct: total ? (t[p.key] / total) * 100 : 0 }));
  });

  protected readonly ingresosPorTipo = computed(() =>
    agrupar(
      this.meses().flatMap((m) => this.store.ingresosFor(m)),
      (i) => (esSalario(i) ? 'Salario neto' : esPrima(i) ? 'Prima' : i.tipo || i.fuente || 'Otro'),
      (i) => i.monto,
    ),
  );

  private readonly gastosRango = computed(() => {
    const { ini, fin } = this.limites();
    return this.store.gastos().filter((g) => g.fecha && g.fecha >= ini && g.fecha <= fin);
  });

  protected readonly gastosPorCategoria = computed(() =>
    agrupar(this.gastosRango(), (g) => g.categoria || 'Sin categoría', (g) => g.monto),
  );

  protected readonly fijosPorServicio = computed(() =>
    agrupar(
      this.meses().flatMap((m) => this.store.fijosFor(m).filter((f) => f.aplica)),
      (f) => f.fijo.servicio,
      (f) => f.pago?.monto ?? f.fijo.monto,
    ),
  );

  private readonly abonosRango = computed(() => {
    const { ini, fin } = this.limites();
    return this.store.abonos().filter((a) => a.fecha && a.fecha >= ini && a.fecha <= fin);
  });

  protected readonly deudasPagos = computed(() => agrupar(this.abonosRango(), (a) => a.deuda || 'Deuda', (a) => a.monto));

  protected readonly deudasResumen = computed(() => ({
    pagado: this.abonosRango().reduce((s, a) => s + a.monto, 0),
    pagos: this.abonosRango().length,
    saldoHoy: this.store.resumenDeudas().saldo,
    activas: this.store.resumenDeudas().activas,
  }));

  protected readonly movimientos = computed<MovConsulta[]>(() => {
    const { ini, fin } = this.limites();
    const enRango = (d: Date | null): d is Date => !!d && d >= ini && d <= fin;
    const tarjetas = new Set(this.store.tarjetas().map((t) => t.id));
    const list: MovConsulta[] = [
      ...this.meses().flatMap((m) =>
        this.store.ingresosFor(m).map((i, n) => ({
          clave: `i${i.row}-${m.getTime()}-${n}`,
          tipo: 'ingreso' as const,
          fecha: i.fecha ?? m,
          titulo: i.fuente || 'Ingreso',
          etiqueta: i.tipo || 'Ingreso',
          monto: i.monto,
        })),
      ),
      ...this.gastosRango().map((g) => ({
        clave: `g${g.row}`,
        tipo: 'gasto' as const,
        fecha: g.fecha!,
        titulo: g.descripcion,
        etiqueta: g.categoria || 'Gasto',
        monto: -g.monto,
      })),
      ...this.store
        .pagos()
        .filter((p) => enRango(p.fecha))
        .map((p) => ({ clave: `p${p.row}`, tipo: 'fijo' as const, fecha: p.fecha!, titulo: p.servicio, etiqueta: 'Fijo pagado', monto: -p.monto })),
      ...this.abonosRango().map((a) => ({
        clave: `a${a.row}`,
        tipo: 'deuda' as const,
        fecha: a.fecha!,
        titulo: `${tarjetas.has(a.deudaId) ? 'Pago tarjeta' : 'Pago deuda'} · ${a.deuda}`,
        etiqueta: a.tipo || 'Abono',
        monto: -a.monto,
      })),
    ];
    return list.sort((a, b) => b.fecha.getTime() - a.fecha.getTime());
  });

  protected readonly movFiltrados = computed(() => {
    const f = this.filtro();
    return f === 'todos' ? this.movimientos() : this.movimientos().filter((m) => m.tipo === f);
  });

  protected readonly movVisibles = computed(() => (this.verTodos() ? this.movFiltrados() : this.movFiltrados().slice(0, 25)));

  protected readonly conteo = computed(() => {
    const c: Partial<Record<string, number>> = { todos: this.movimientos().length };
    for (const m of this.movimientos()) c[m.tipo] = (c[m.tipo] ?? 0) + 1;
    return c;
  });

  protected readonly hoverMes = computed(() => {
    const i = this.hover();
    return i === null ? null : (this.resumenes()[i] ?? null);
  });

  protected readonly etiquetaRango = computed(() => {
    const m = this.meses();
    return m.length === 1 ? monthLabel(m[0]) : `${monthLabel(m[0])} – ${monthLabel(m.at(-1)!)}`;
  });

  protected setDesde(value: string): void {
    const d = aMes(value);
    if (!d) return;
    this.desde.set(d);
    if (d > this.hasta()) this.hasta.set(d);
    if (monthsBetween(d, this.hasta()) >= MAX_MESES) this.hasta.set(addMonths(d, MAX_MESES - 1));
  }

  protected setHasta(value: string): void {
    const d = aMes(value);
    if (!d) return;
    this.hasta.set(d);
    if (d < this.desde()) this.desde.set(d);
    if (monthsBetween(this.desde(), d) >= MAX_MESES) this.desde.set(addMonths(d, -(MAX_MESES - 1)));
  }

  protected aplicarPreset(desde: number): void {
    this.hasta.set(this.hoy);
    this.desde.set(addMonths(this.hoy, desde));
  }

  protected presetActivo(desde: number): boolean {
    return this.hasta().getTime() === this.hoy.getTime() && this.desde().getTime() === addMonths(this.hoy, desde).getTime();
  }

  protected fecha(d: Date): string {
    return `${d.getDate()} ${monthName(d, true)} ${d.getFullYear()}`;
  }

  protected async actualizar(): Promise<void> {
    await this.store.load();
    if (!this.store.error()) this.ui.notify('Consulta actualizada desde Google Sheets');
  }

  protected descargarCsv(): void {
    const filas = [
      ['Mes', 'Ingresos', 'Fijos', 'Variables', 'Deudas', 'Ahorro', 'Gastos', 'Balance'],
      ...this.resumenes().map((r) => [monthLabel(r.month), r.ingresos, r.fijos, r.variables, r.deudas, r.ahorro, r.gastos, r.balance]),
      [],
      ['Fecha', 'Tipo', 'Concepto', 'Etiqueta', 'Monto'],
      ...this.movimientos().map((m) => [toIsoDate(m.fecha), m.tipo, m.titulo, m.etiqueta, m.monto]),
    ];
    const csv = filas.map((f) => f.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `consulta-${this.desdeValor()}_${this.hastaValor()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    this.ui.notify("CSV de la consulta descargado");
  }
}
