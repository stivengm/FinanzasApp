import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService, SesionExpiradaError, WriteValues } from './api.service';
import { addMonths, endOfMonth, monthsBetween, sameMonth, startOfMonth, toIsoDate } from './dates';
import { DEMO_PERFIL, demoTables } from './demo-data';
import { Fijo, FijoMes, Gasto, Ingreso, MetaAhorro, Movimiento, Pago, Perfil, SheetTable, TAB_LABELS, TabKey } from './models';
import { desgloseSalario } from './nomina';
import { mapRows, normalize, toDate, toNumber, toText } from './parse';
import { SessionService } from './session.service';

const MONTO = ['monto', 'valor', 'importe', 'cantidad', 'total', 'precio'];

export interface MonthSummary {
  month: Date;
  ingresos: number;
  fijos: number;
  variables: number;
  ahorro: number;
  gastos: number;
  balance: number;
}

export interface PrimaSugerida {
  mes: 'junio' | 'diciembre';
  monto: number;
  limite: Date;
  registrada: boolean;
}

function periodMonths(frecuencia: string): number {
  const f = normalize(frecuencia);
  if (f.includes('bimes')) return 2;
  if (f.includes('trimes')) return 3;
  if (f.includes('semes')) return 6;
  if (f.includes('anual')) return 12;
  return 1;
}

export function esPrima(i: Pick<Ingreso, 'tipo' | 'fuente'>): boolean {
  return normalize(`${i.tipo} ${i.fuente}`).includes('prima');
}

/**
 * Prima de servicios (Colombia): medio salario bruto en junio (hasta el 30) y otro en diciembre
 * (hasta el 20). No tiene descuentos de salud ni pensión.
 */
export function primaPara(month: Date, salario: number): Omit<PrimaSugerida, 'registrada'> | null {
  const m = month.getMonth();
  if ((m !== 5 && m !== 11) || salario <= 0) return null;
  return {
    mes: m === 5 ? 'junio' : 'diciembre',
    monto: Math.round(salario / 2),
    limite: new Date(month.getFullYear(), m, m === 5 ? 30 : 20),
  };
}

@Injectable({ providedIn: 'root' })
export class FinanceStore {
  private readonly session = inject(SessionService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  private readonly tables = signal<Partial<Record<TabKey, SheetTable>>>({});

  readonly perfil = signal<Perfil | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly lastSync = signal<Date | null>(null);
  readonly month = signal(startOfMonth(new Date()));

  /** Salario bruto del perfil: base de la prima. */
  readonly salario = computed(() => this.perfil()?.salario ?? 0);
  /** Bruto − 4% salud − 4% pensión: lo que realmente entra cada mes. */
  readonly salarioDesglose = computed(() => desgloseSalario(this.salario()));
  readonly ingresos = computed(() => this.mapIngresos(this.tables().ingresos));
  readonly metas = computed(() => this.mapMetas(this.tables().ahorro));
  readonly fijos = computed(() => this.mapFijos(this.tables().fijos));
  readonly pagos = computed(() => this.mapPagos(this.tables().pagos));
  readonly gastos = computed(() => this.mapGastos(this.tables().gastos));

  readonly ingresosMes = computed(() => this.ingresosFor(this.month()));
  readonly gastosMes = computed(() =>
    this.gastos()
      .filter((g) => sameMonth(g.fecha, this.month()))
      .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0)),
  );
  readonly fijosMes = computed(() => this.fijosFor(this.month()));
  readonly summary = computed(() => this.summaryFor(this.month()));
  readonly previousSummary = computed(() => this.summaryFor(addMonths(this.month(), -1)));

  /** Prima sugerida si el mes seleccionado es junio o diciembre. */
  readonly prima = computed<PrimaSugerida | null>(() => {
    const base = primaPara(this.month(), this.salario());
    if (!base) return null;
    const registrada = this.ingresos().some((i) => sameMonth(i.fecha, this.month()) && esPrima(i));
    return { ...base, registrada };
  });

  /** Próxima prima a partir del mes seleccionado (para mostrarla como recordatorio). */
  readonly proximaPrima = computed(() => {
    for (let i = 0; i < 12; i++) {
      const month = addMonths(this.month(), i);
      const prima = primaPara(month, this.salario());
      if (prima) return prima;
    }
    return null;
  });

  /** Variación del balance contra el mes anterior, en %. */
  readonly balanceTrend = computed(() => {
    const prev = this.previousSummary().balance;
    if (!prev) return null;
    return ((this.summary().balance - prev) / Math.abs(prev)) * 100;
  });

  readonly ahorroMeta = computed(() => {
    const metas = this.metas();
    const meta = metas.reduce((s, m) => s + m.meta, 0);
    const ahorrado = metas.reduce((s, m) => s + m.ahorrado, 0);
    return { meta, ahorrado, pct: meta ? Math.round((ahorrado / meta) * 100) : 0 };
  });

  readonly movimientos = computed<Movimiento[]>(() => {
    const limit = endOfMonth(this.month()).getTime();
    const list: Movimiento[] = [
      ...this.gastos().map((g) => ({
        tipo: 'gasto' as const,
        titulo: g.descripcion,
        fecha: g.fecha,
        etiqueta: g.categoria || 'Gasto',
        monto: -g.monto,
        fila: g.row,
        pestana: TAB_LABELS.gastos,
      })),
      ...this.ingresos().map((i) => ({
        tipo: 'ingreso' as const,
        titulo: i.fuente,
        fecha: i.fecha,
        etiqueta: i.tipo || 'Ingreso',
        monto: i.monto,
        fila: i.row,
        pestana: TAB_LABELS.ingresos,
      })),
      ...this.pagos().map((p) => ({
        tipo: 'fijo' as const,
        titulo: p.servicio,
        fecha: p.fecha,
        etiqueta: 'Fijo',
        monto: -p.monto,
        fila: p.row,
        pestana: TAB_LABELS.pagos,
      })),
    ];
    return list
      .filter((m) => (m.fecha?.getTime() ?? 0) <= limit)
      .sort((a, b) => (b.fecha?.getTime() ?? 0) - (a.fecha?.getTime() ?? 0));
  });

  async load(): Promise<void> {
    const sesion = this.session.sesion();
    if (!sesion || this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    try {
      if (sesion.modo === 'demo') {
        if (!this.tables().gastos) this.tables.set(demoTables());
        if (!this.perfil()) this.perfil.set({ ...DEMO_PERFIL });
      } else {
        const res = await this.api.data(sesion);
        this.perfil.set(res.perfil);
        this.tables.set(res.tablas);
      }
      this.lastSync.set(new Date());
    } catch (e) {
      if (e instanceof SesionExpiradaError) this.expirar();
      else this.error.set((e as Error).message);
    } finally {
      this.loading.set(false);
    }
  }

  reset(): void {
    this.tables.set({});
    this.perfil.set(null);
    this.error.set(null);
    this.lastSync.set(null);
  }

  logout(): void {
    this.session.cerrar();
    this.reset();
    this.router.navigate(['/ingresar']);
  }

  setMonth(month: Date): void {
    this.month.set(startOfMonth(month));
  }

  // ---------- Escritura ----------

  async updatePerfil(values: Partial<Pick<Perfil, 'nombre' | 'salario'>>): Promise<void> {
    const sesion = this.session.sesion();
    const actual = this.perfil();
    if (!sesion || !actual) return;
    this.saving.set(true);
    try {
      if (sesion.modo === 'demo') this.perfil.set({ ...actual, ...values });
      else this.perfil.set((await this.api.profile(sesion, values)).perfil);
    } catch (e) {
      if (e instanceof SesionExpiradaError) this.expirar();
      throw e;
    } finally {
      this.saving.set(false);
    }
  }

  addGasto(g: Omit<Gasto, 'row'>): Promise<void> {
    return this.write('gastos', {
      Fecha: toIsoDate(g.fecha ?? new Date()),
      Descripción: g.descripcion,
      Detalle: g.detalle,
      Categoría: g.categoria,
      'Método de Pago': g.metodoPago,
      Monto: g.monto,
    });
  }

  addIngreso(i: Omit<Ingreso, 'row'>): Promise<void> {
    return this.write('ingresos', {
      Fecha: toIsoDate(i.fecha ?? new Date()),
      Fuente: i.fuente,
      Descripción: i.descripcion,
      Tipo: i.tipo,
      Monto: i.monto,
    });
  }

  addFijo(f: Omit<Fijo, 'row'>): Promise<void> {
    return this.write('fijos', {
      Servicio: f.servicio,
      Proveedor: f.proveedor,
      Categoría: f.categoria,
      Frecuencia: f.frecuencia,
      'Día de Pago': f.diaPago ?? '',
      Monto: f.monto,
    });
  }

  addMeta(m: Omit<MetaAhorro, 'row'>): Promise<void> {
    return this.write('ahorro', {
      Objetivo: m.objetivo,
      Descripción: m.descripcion,
      Meta: m.meta,
      Ahorrado: m.ahorrado,
      'Aporte Mensual': m.aporteMensual,
    });
  }

  marcarPagado(item: FijoMes, monto = item.fijo.monto): Promise<void> {
    const today = new Date();
    const fecha = sameMonth(today, this.month()) ? today : item.vence;
    return this.write('pagos', { Fecha: toIsoDate(fecha), Servicio: item.fijo.servicio, Monto: monto });
  }

  private async write(key: TabKey, values: WriteValues): Promise<void> {
    const sesion = this.session.sesion();
    if (!sesion) throw new Error('Ingresa de nuevo para guardar');
    this.saving.set(true);
    try {
      const row = sesion.modo === 'cuenta' ? (await this.api.append(sesion, key, values)).row : undefined;
      this.appendLocal(key, values, row);
    } catch (e) {
      if (e instanceof SesionExpiradaError) this.expirar();
      throw e;
    } finally {
      this.saving.set(false);
    }
  }

  private expirar(): void {
    this.logout();
  }

  /** Refleja la fila nueva al instante, sin volver a descargar todo. */
  private appendLocal(key: TabKey, values: WriteValues, rowNumber?: number): void {
    const byKey = new Map(Object.entries(values).map(([k, v]) => [normalize(k), v]));
    this.tables.update((tables) => {
      const table = tables[key] ?? { headers: Object.keys(values), rows: [] };
      const cells = table.headers.map((h) => {
        const v = byKey.get(normalize(h));
        if (v === undefined) return null;
        return normalize(h).startsWith('fecha') && typeof v === 'string' ? toDate(v) : v;
      });
      const row = rowNumber ?? (table.rows.at(-1)?.rowNumber ?? 1) + 1;
      return { ...tables, [key]: { ...table, rows: [...table.rows, { rowNumber: row, cells }] } };
    });
  }

  // ---------- Cálculos por mes ----------

  /** Salario neto (todos los meses) + ingresos registrados en ese mes. */
  ingresosFor(month: Date): Ingreso[] {
    const extras = this.ingresos().filter((i) => sameMonth(i.fecha, month));
    const neto = this.salarioDesglose().neto;
    if (!neto) return extras;
    const fijo: Ingreso = { row: 0, fecha: startOfMonth(month), fuente: 'Salario', descripcion: 'Salario neto (bruto − 8%)', tipo: 'Salario', monto: neto };
    return [fijo, ...extras];
  }

  fijosFor(month: Date): FijoMes[] {
    const pagos = this.pagos();
    return this.fijos().map((fijo) => {
      const key = normalize(fijo.servicio);
      const propios = pagos
        .filter((p) => normalize(p.servicio) === key && p.fecha)
        .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());
      const pago = propios.find((p) => sameMonth(p.fecha, month)) ?? null;
      const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
      const vence = new Date(month.getFullYear(), month.getMonth(), Math.min(fijo.diaPago || lastDay, lastDay));

      const period = periodMonths(fijo.frecuencia);
      let aplica = true;
      let proximoCobro: Date | null = null;
      const anterior = [...propios].reverse().find((p) => p.fecha! < startOfMonth(month));
      if (!pago && period > 1 && anterior) {
        const diff = monthsBetween(anterior.fecha!, month);
        aplica = diff % period === 0;
        if (!aplica) proximoCobro = addMonths(month, period - (diff % period));
      }
      return { fijo, aplica, pago, vence, proximoCobro };
    });
  }

  summaryFor(month: Date): MonthSummary {
    const ingresos = this.ingresosFor(month).reduce((s, i) => s + i.monto, 0);
    const fijos = this.fijosFor(month)
      .filter((f) => f.aplica)
      .reduce((s, f) => s + (f.pago?.monto ?? f.fijo.monto), 0);
    const variables = this.gastos()
      .filter((g) => sameMonth(g.fecha, month))
      .reduce((s, g) => s + g.monto, 0);
    const ahorro = this.metas().reduce((s, m) => s + m.aporteMensual, 0);
    const gastos = fijos + variables;
    return { month, ingresos, fijos, variables, ahorro, gastos, balance: ingresos - gastos - ahorro };
  }

  // ---------- Mapeo de pestañas ----------

  private mapIngresos(t?: SheetTable): Ingreso[] {
    if (!t) return [];
    return mapRows(
      t,
      {
        fecha: ['fecha', 'dia'],
        fuente: ['fuente', 'concepto', 'nombre', 'ingreso'],
        descripcion: ['descripcion', 'detalle', 'nota', 'notas'],
        tipo: ['tipo', 'categoria', 'clase'],
        monto: MONTO,
      },
      (get, row) => {
        const monto = toNumber(get('monto'));
        const fuente = toText(get('fuente')) || toText(get('descripcion'));
        if (!monto && !fuente) return null;
        return {
          row,
          fecha: toDate(get('fecha')),
          fuente: fuente || 'Ingreso',
          descripcion: toText(get('descripcion')),
          tipo: toText(get('tipo')),
          monto: Math.abs(monto),
        };
      },
    );
  }

  private mapMetas(t?: SheetTable): MetaAhorro[] {
    if (!t) return [];
    return mapRows(
      t,
      {
        objetivo: ['objetivo', 'meta nombre', 'nombre', 'concepto'],
        descripcion: ['descripcion', 'detalle', 'nota'],
        meta: ['meta', 'objetivo monto', 'monto meta', 'valor meta'],
        ahorrado: ['ahorrado', 'acumulado', 'actual', 'saldo'],
        aporteMensual: ['aporte mensual', 'aporte', 'cuota', 'mensual'],
      },
      (get, row) => {
        const objetivo = toText(get('objetivo'));
        if (!objetivo) return null;
        return {
          row,
          objetivo,
          descripcion: toText(get('descripcion')),
          meta: toNumber(get('meta')),
          ahorrado: toNumber(get('ahorrado')),
          aporteMensual: toNumber(get('aporteMensual')),
        };
      },
    );
  }

  private mapFijos(t?: SheetTable): Fijo[] {
    if (!t) return [];
    return mapRows(
      t,
      {
        servicio: ['servicio', 'concepto', 'nombre', 'responsabilidad', 'descripcion'],
        proveedor: ['proveedor', 'empresa', 'entidad'],
        categoria: ['categoria', 'tipo'],
        frecuencia: ['frecuencia', 'periodicidad'],
        diaPago: ['dia de pago', 'dia pago', 'dia', 'vencimiento', 'dia vencimiento'],
        monto: MONTO,
      },
      (get, row) => {
        const servicio = toText(get('servicio'));
        if (!servicio) return null;
        const dia = get('diaPago');
        const date = dia instanceof Date ? dia : null;
        const diaPago = date ? date.getDate() : toNumber(dia) || null;
        return {
          row,
          servicio,
          proveedor: toText(get('proveedor')),
          categoria: toText(get('categoria')),
          frecuencia: toText(get('frecuencia')) || 'Mensual',
          diaPago: diaPago && diaPago <= 31 ? Math.round(diaPago) : null,
          monto: Math.abs(toNumber(get('monto'))),
        };
      },
    );
  }

  private mapPagos(t?: SheetTable): Pago[] {
    if (!t) return [];
    return mapRows(
      t,
      { fecha: ['fecha'], servicio: ['servicio', 'concepto', 'nombre', 'fijo'], monto: MONTO },
      (get, row) => {
        const servicio = toText(get('servicio'));
        if (!servicio) return null;
        return { row, fecha: toDate(get('fecha')), servicio, monto: Math.abs(toNumber(get('monto'))) };
      },
    );
  }

  private mapGastos(t?: SheetTable): Gasto[] {
    if (!t) return [];
    return mapRows(
      t,
      {
        fecha: ['fecha', 'dia'],
        descripcion: ['descripcion', 'concepto', 'gasto', 'nombre'],
        detalle: ['detalle', 'nota', 'notas', 'lugar', 'comercio'],
        categoria: ['categoria', 'tipo', 'clase'],
        metodoPago: ['metodo de pago', 'metodo', 'medio de pago', 'medio', 'forma de pago', 'pago'],
        monto: MONTO,
      },
      (get, row) => {
        const monto = toNumber(get('monto'));
        const descripcion = toText(get('descripcion'));
        if (!monto && !descripcion) return null;
        return {
          row,
          fecha: toDate(get('fecha')),
          descripcion: descripcion || 'Gasto',
          detalle: toText(get('detalle')),
          categoria: toText(get('categoria')),
          metodoPago: toText(get('metodoPago')),
          monto: Math.abs(monto),
        };
      },
    );
  }
}
