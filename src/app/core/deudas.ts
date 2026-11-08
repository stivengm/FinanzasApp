import { addMonths, endOfMonth, startOfMonth } from './dates';
import { Abono, CargoTarjeta, Deuda } from './models';

/** Un pago (o una compra, en tarjetas) y cómo afectó el saldo. */
export interface MovimientoDeuda {
  clave: string;
  fecha: Date | null;
  /** Tipo de pago (Cuota, Pago total…) o "Compra". */
  tipo: string;
  /** Razón del pago o descripción de la compra. */
  detalle: string;
  esCargo: boolean;
  monto: number;
  interes: number;
  capital: number;
  saldoDespues: number;
  abono?: Abono;
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
  /** Compras con tarjeta del mes consultado. */
  comprasMes: number;
  /** Tarjetas: saldo con el que empezó el mes (lo que hay que pagar ese mes). */
  saldoInicioMes: number;
  /** Tarjetas: lo que falta pagar del saldo de inicio de mes. */
  porPagarMes: number;
  /** Tarjetas: cupo disponible. */
  disponible: number;
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

type Evento = { fecha: Date; abono?: Abono; cargo?: CargoTarjeta };

/**
 * Saldo de una deuda al cierre de `hasta`.
 * - Préstamo: desde el mes siguiente al préstamo, cada mes se suma el interés sobre el saldo de inicio de mes.
 * - Tarjeta: las compras suben el saldo; al cerrar cada mes se cobra interés solo sobre la parte del
 *   saldo de inicio de mes que no se pagó (si se paga el total, no hay interés). El mes en curso no se cierra.
 * En ambos casos cada pago cubre primero el interés pendiente y el resto baja el capital.
 */
export function estadoDeuda(deuda: Deuda, abonos: Abono[], hasta: Date, cargos: CargoTarjeta[] = [], hoy = new Date()): EstadoDeuda {
  const tarjeta = deuda.tipo === 'Tarjeta';
  const eventos: Evento[] = [
    ...abonos.filter((a) => a.deudaId === deuda.id && a.fecha && a.fecha <= hasta).map((a) => ({ fecha: a.fecha!, abono: a })),
    ...(tarjeta ? cargos.filter((c) => c.tarjeta === deuda.id && c.fecha && c.fecha <= hasta).map((c) => ({ fecha: c.fecha!, cargo: c })) : []),
  ].sort((a, b) => a.fecha.getTime() - b.fecha.getTime());
  const inicio = startOfMonth(deuda.fecha ?? eventos[0]?.fecha ?? hasta);
  const mesFinal = startOfMonth(hasta);

  let saldo = deuda.monto;
  let interesPendiente = 0;
  let interesesTotales = 0;
  let interesMes = 0;
  let pagadoMes = 0;
  let comprasMes = 0;
  let saldoInicioMes = saldo;
  const movimientos: MovimientoDeuda[] = [];

  let i = 0;
  for (let mes = inicio; mes <= mesFinal; mes = addMonths(mes, 1)) {
    const esFinal = mes.getTime() === mesFinal.getTime();
    if (!tarjeta && mes > inicio) {
      const interes = interesDelMes(saldo, deuda.tasaMensual);
      saldo += interes;
      interesPendiente += interes;
      interesesTotales += interes;
      if (esFinal) interesMes = interes;
    }
    const inicioMes = saldo;
    let pagosMes = 0;
    // Eventos del mes (los anteriores a la fecha de la deuda cuentan en el primer mes).
    while (i < eventos.length && startOfMonth(eventos[i].fecha) <= mes) {
      const { abono, cargo, fecha } = eventos[i++];
      if (cargo) {
        saldo += cargo.monto;
        if (esFinal) comprasMes += cargo.monto;
        movimientos.push({
          clave: `c-${cargo.origen}-${cargo.row}`,
          fecha,
          tipo: 'Compra',
          detalle: cargo.descripcion,
          esCargo: true,
          monto: cargo.monto,
          interes: 0,
          capital: 0,
          saldoDespues: Math.max(saldo, 0),
        });
        continue;
      }
      const a = abono!;
      const interes = Math.min(a.monto, interesPendiente);
      interesPendiente -= interes;
      saldo -= a.monto;
      pagosMes += a.monto;
      if (esFinal) pagadoMes += a.monto;
      movimientos.push({
        clave: `a-${a.row}`,
        fecha,
        tipo: a.tipo,
        detalle: a.nota,
        esCargo: false,
        monto: a.monto,
        interes,
        capital: a.monto - interes,
        saldoDespues: Math.max(saldo, 0),
        abono: a,
      });
    }
    if (esFinal) saldoInicioMes = inicioMes;
    // Tarjeta: al cerrar el mes, interés sobre el saldo anterior que quedó sin pagar.
    if (tarjeta && endOfMonth(mes) < hoy) {
      const interes = interesDelMes(inicioMes - pagosMes, deuda.tasaMensual);
      saldo += interes;
      interesPendiente += interes;
      interesesTotales += interes;
      if (esFinal) interesMes = interes;
    }
  }

  const pagos = movimientos.filter((m) => !m.esCargo);
  const pagadoTotal = pagos.reduce((s, m) => s + m.monto, 0);
  const capitalPagado = pagos.reduce((s, m) => s + m.capital, 0);
  const huboDeuda = deuda.monto > 0 || movimientos.length > 0;
  // Una tarjeta en $0 sigue activa (se puede volver a usar); un préstamo en $0 queda pagado.
  const pagada = !tarjeta && saldo <= 0 && huboDeuda;
  saldo = Math.max(saldo, 0);

  return {
    deuda,
    saldo,
    interesesTotales,
    pagadoTotal,
    capitalPagado,
    interesMes,
    pagadoMes,
    comprasMes,
    saldoInicioMes: Math.max(saldoInicioMes, 0),
    porPagarMes: Math.max(saldoInicioMes - pagadoMes, 0),
    disponible: Math.max(deuda.cupo - saldo, 0),
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
