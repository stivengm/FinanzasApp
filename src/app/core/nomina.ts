/** Aportes obligatorios del empleado en Colombia, descontados del salario bruto. */
export const APORTE_SALUD = 0.04;
export const APORTE_PENSION = 0.04;

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
