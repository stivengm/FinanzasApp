/** Aportes obligatorios del empleado en Colombia, descontados del salario bruto. */
export const APORTE_SALUD = 0.04;
export const APORTE_PENSION = 0.04;

/** Días de un semestre completo en nómina (meses comerciales de 30 días). */
export const DIAS_SEMESTRE = 180;

export interface DesgloseSalario {
  bruto: number;
  salud: number;
  pension: number;
  neto: number;
}

/**
 * Salario neto = bruto − 4% salud − 4% pensión.
 * No incluye retención en la fuente ni fondo de solidaridad pensional (desde 4 SMMLV).
 */
export function desgloseSalario(bruto: number): DesgloseSalario {
  const salud = Math.round(bruto * APORTE_SALUD);
  const pension = Math.round(bruto * APORTE_PENSION);
  return { bruto, salud, pension, neto: bruto - salud - pension };
}

function esFinDeMes(d: Date): boolean {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getDate() === 1;
}

/**
 * Días trabajados entre dos fechas (incluidas) con meses comerciales de 30 días,
 * como se liquida la nómina en Colombia: 1 jul → 31 dic = 180 días.
 */
export function dias360(desde: Date, hasta: Date): number {
  if (hasta < desde) return 0;
  const d1 = esFinDeMes(desde) ? 30 : Math.min(desde.getDate(), 30);
  const d2 = esFinDeMes(hasta) ? 30 : Math.min(hasta.getDate(), 30);
  return (hasta.getFullYear() - desde.getFullYear()) * 360 + (hasta.getMonth() - desde.getMonth()) * 30 + (d2 - d1) + 1;
}

/** Semestre de prima al que pertenece un mes: ene–jun o jul–dic. */
export function semestreDe(month: Date): { inicio: Date; fin: Date } {
  const y = month.getFullYear();
  return month.getMonth() < 6
    ? { inicio: new Date(y, 0, 1), fin: new Date(y, 5, 30) }
    : { inicio: new Date(y, 6, 1), fin: new Date(y, 11, 31) };
}

/** Prima de servicios = salario base × días trabajados ÷ 360 (semestre completo = salario ÷ 2). */
export function calcularPrima(base: number, desde: Date, hasta: Date): { dias: number; monto: number } {
  const dias = Math.min(dias360(desde, hasta), DIAS_SEMESTRE);
  return { dias, monto: Math.round((base * dias) / 360) };
}
