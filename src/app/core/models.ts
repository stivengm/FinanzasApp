export type Cell = string | number | Date | null;

/** Una pestaña leída de la hoja: encabezados + filas (rowNumber es la fila real en Sheets). */
export interface SheetTable {
  headers: string[];
  rows: { rowNumber: number; cells: Cell[] }[];
}

export interface Ingreso {
  row: number;
  fecha: Date | null;
  fuente: string;
  descripcion: string;
  tipo: string;
  monto: number;
}

export interface MetaAhorro {
  row: number;
  objetivo: string;
  descripcion: string;
  meta: number;
  ahorrado: number;
  aporteMensual: number;
}

export interface Fijo {
  row: number;
  servicio: string;
  proveedor: string;
  categoria: string;
  frecuencia: string;
  diaPago: number | null;
  monto: number;
}

export interface Pago {
  row: number;
  fecha: Date | null;
  servicio: string;
  monto: number;
}

export interface Gasto {
  row: number;
  fecha: Date | null;
  descripcion: string;
  detalle: string;
  categoria: string;
  metodoPago: string;
  monto: number;
}

export type TabKey = 'ingresos' | 'ahorro' | 'fijos' | 'pagos' | 'gastos';

/** Nombres de las pestañas en la hoja (definidos en plantilla/apps-script.gs). */
export const TAB_LABELS: Record<TabKey, string> = {
  ingresos: 'Ingresos',
  ahorro: 'Ahorro',
  fijos: 'Fijos',
  pagos: 'Pagos',
  gastos: 'Gastos',
};

export type TipoSalario = 'Fijo' | 'Variable';

export interface Perfil {
  usuario: string;
  nombre: string;
  /** Salario bruto mensual (solo aplica al salario fijo). */
  salario: number;
  /** Fijo: el mismo cada mes. Variable: se registra cada mes en Ingresos (Tipo = Salario). */
  tipoSalario: TipoSalario;
  /** Fecha de ingreso a la empresa (yyyy-mm-dd) para la prima proporcional. */
  fechaIngreso: string;
}

export interface Sesion {
  modo: 'cuenta' | 'demo';
  usuario: string;
  token: string;
}

/** Estado de una responsabilidad fija en el mes seleccionado. */
export interface FijoMes {
  fijo: Fijo;
  aplica: boolean;
  pago: Pago | null;
  vence: Date;
  proximoCobro: Date | null;
}

export interface Movimiento {
  tipo: 'gasto' | 'ingreso' | 'fijo';
  titulo: string;
  fecha: Date | null;
  etiqueta: string;
  monto: number;
  fila: number;
  pestana: string;
}
