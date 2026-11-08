import { addMonths, startOfMonth } from './dates';
import { Abono, Deuda } from './models';

/** Cómo se repartió un pago entre intereses y capital. */
export interface MovimientoDeuda {
  abono: Abono;
  interes: number;
  capital: number;
  saldoDespues: number;
}

export interface EstadoDeuda {
  deuda: Deuda;
  saldo: number;
  /** Intereses causados desde el inicio hasta el mes consultado. */
  interesesTotales: number;
  pagadoTotal: number;
  capitalPagado: number;
  /** Interés causado en el mes consultado. */
  interesMes: number;
  pagadoMes: number;
  pagada: boolean;
  /** Meses que faltan pagando la cuota pactada; null si no hay cuota o no alcanza a cubrir el interés. */
  mesesRestantes: number | null;
  /** Historial, del más reciente al más antiguo. */
  movimientos: MovimientoDeuda[];
}

/** Convierte una tasa efectiva anual (%) a su equivalente mensual (%). */
export function tasaMensualDesdeEA(ea: number): number {
  return (Math.pow(1 + ea / 100, 1 / 12) - 1) * 100;
}

/** Interés de un mes sobre un saldo, redondeado a pesos. */
export function interesDelMes(saldo: number, tasaMensual: number): number {
  return saldo > 0 && tasaMensual > 0 ? Math.round((saldo * tasaMensual) / 100) : 0;
}

/**
 * Saldo de una deuda al cierre de `hasta`.
 * Cada mes, desde el siguiente al préstamo, se suma el interés sobre el saldo de inicio de mes.
 * Los pagos cubren primero el interés pendiente y el resto baja el capital.
 */
export function estadoDeuda(deuda: Deuda, abonos: Abono[], hasta: Date): EstadoDeuda {
  const propios = abonos
    .filter((a) => a.deudaId === deuda.id && a.fecha && a.fecha <= hasta)
    .sort((a, b) => a.fecha!.getTime() - b.fecha!.getTime());
  const inicio = startOfMonth(deuda.fecha ?? propios[0]?.fecha ?? hasta);
  const mesFinal = startOfMonth(hasta);

  let saldo = deuda.monto;
  let interesPendiente = 0;
  let interesesTotales = 0;
  let interesMes = 0;
  let pagadoMes = 0;
  const movimientos: MovimientoDeuda[] = [];

  let i = 0;
  for (let mes = inicio; mes <= mesFinal; mes = addMonths(mes, 1)) {
    const esFinal = mes.getTime() === mesFinal.getTime();
    if (mes > inicio) {
      const interes = interesDelMes(saldo, deuda.tasaMensual);
      saldo += interes;
      interesPendiente += interes;
      interesesTotales += interes;
      if (esFinal) interesMes = interes;
    }
    // Pagos del mes (los anteriores a la fecha del préstamo cuentan en el primer mes).
    while (i < propios.length && startOfMonth(propios[i].fecha!) <= mes) {
      const abono = propios[i++];
      const interes = Math.min(abono.monto, interesPendiente);
      interesPendiente -= interes;
      saldo -= abono.monto;
      movimientos.push({ abono, interes, capital: abono.monto - interes, saldoDespues: Math.max(saldo, 0) });
      if (esFinal) pagadoMes += abono.monto;
    }
  }

  const pagadoTotal = movimientos.reduce((s, m) => s + m.abono.monto, 0);
  const capitalPagado = movimientos.reduce((s, m) => s + m.capital, 0);
  const pagada = saldo <= 0 && (deuda.monto > 0 || pagadoTotal > 0);
  saldo = Math.max(saldo, 0);

  return {
    deuda,
    saldo,
    interesesTotales,
    pagadoTotal,
    capitalPagado,
    interesMes,
    pagadoMes,
    pagada,
    mesesRestantes: pagada ? 0 : mesesParaPagar(saldo, deuda.tasaMensual, deuda.cuota),
    movimientos: movimientos.reverse(),
  };
}

/** Meses pagando `cuota` hasta saldar; null si la cuota no cubre ni el interés. */
export function mesesParaPagar(saldo: number, tasaMensual: number, cuota: number): number | null {
  if (cuota <= 0 || saldo <= 0) return saldo <= 0 ? 0 : null;
  if (cuota <= interesDelMes(saldo, tasaMensual)) return null;
  let s = saldo;
  let meses = 0;
  while (s > 0 && meses < 600) {
    meses++;
    s += interesDelMes(s, tasaMensual);
    s -= cuota;
  }
  return meses;
}
