import { Cell, Perfil, SheetTable, TabKey } from './models';

/** Fecha en el mes actual desplazado `offset` meses (día limitado al fin de mes). */
function d(offset: number, day: number): Date {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() + offset + 1, 0).getDate();
  return new Date(now.getFullYear(), now.getMonth() + offset, Math.min(day, last));
}

function table(headers: string[], rows: Cell[][]): SheetTable {
  return { headers, rows: rows.map((cells, i) => ({ rowNumber: i + 2, cells })) };
}

const today = new Date().getDate();

export const DEMO_PERFIL: Perfil = { usuario: 'demo', nombre: 'Carlos', salario: 4200000, tipoSalario: 'Fijo', fechaIngreso: '' };

/** Datos de ejemplo anclados al mes actual (el salario vive en el perfil). */
export function demoTables(): Record<TabKey, SheetTable> {
  return {
    ingresos: table(
      ['Fecha', 'Fuente', 'Descripción', 'Tipo', 'Monto'],
      [
        [d(0, 5), 'Arriendo Apartamento 301', 'Ingreso adicional', 'Renta', 850000],
        [d(0, Math.max(1, today - 1)), 'Freelance / Consultoría', 'Trabajo extra de diseño', 'Extra', 150000],
        [d(-1, 5), 'Arriendo Apartamento 301', 'Ingreso adicional', 'Renta', 850000],
        [d(-1, 18), 'Freelance / Consultoría', 'Landing page cliente', 'Extra', 300000],
        [d(-2, 5), 'Arriendo Apartamento 301', 'Ingreso adicional', 'Renta', 850000],
        [d(-2, 22), 'Venta bicicleta', 'Venta artículo usado', 'Otro', 200000],
      ],
    ),
    ahorro: table(
      ['Objetivo', 'Descripción', 'Meta', 'Ahorrado', 'Aporte Mensual'],
      [
        ['Fondo de Emergencia', '6 meses de gastos', 500000, 350000, 350000],
        ['Viaje Vacaciones', 'Viaje de fin de año', 300000, 150000, 150000],
      ],
    ),
    fijos: table(
      ['Servicio', 'Proveedor', 'Categoría', 'Frecuencia', 'Día de Pago', 'Monto'],
      [
        ['Servicio de Luz', 'Empresas Públicas', 'Servicios', 'Mensual', 28, 145000],
        ['Servicio de Gas', 'Gas Natural', 'Servicios', 'Mensual', 22, 38000],
        ['Internet Casa (Fibra 300Mb)', 'Fibra Óptica', 'Servicios', 'Mensual', 30, 110000],
        ['Servicio de Agua (Acueducto)', 'Acueducto', 'Servicios', 'Bimestral', 15, 95000],
        ['Internet Celular (Plan Móvil)', 'Operador móvil', 'Servicios', 'Mensual', 15, 52000],
        ['Administración Edificio', 'Conjunto residencial', 'Vivienda', 'Mensual', 5, 360000],
        ['Parqueadero Carro', 'Parqueadero', 'Transporte', 'Mensual', 31, 180000],
      ],
    ),
    pagos: table(
      ['Fecha', 'Servicio', 'Monto'],
      [
        [d(-2, 5), 'Administración Edificio', 360000],
        [d(-2, 15), 'Internet Celular (Plan Móvil)', 52000],
        [d(-1, 20), 'Servicio de Agua (Acueducto)', 95000],
        [d(-2, 22), 'Servicio de Gas', 36000],
        [d(-2, 28), 'Servicio de Luz', 140000],
        [d(-2, 30), 'Internet Casa (Fibra 300Mb)', 110000],
        [d(-2, 31), 'Parqueadero Carro', 180000],
        [d(-1, 5), 'Administración Edificio', 360000],
        [d(-1, 15), 'Internet Celular (Plan Móvil)', 52000],
        [d(-1, 22), 'Servicio de Gas', 37000],
        [d(-1, 28), 'Servicio de Luz', 150000],
        [d(-1, 30), 'Internet Casa (Fibra 300Mb)', 110000],
        [d(-1, 30), 'Parqueadero Carro', 180000],
        [d(0, 5), 'Administración Edificio', 360000],
        [d(0, Math.min(15, today)), 'Internet Celular (Plan Móvil)', 52000],
        [d(0, Math.min(12, today)), 'Servicio de Gas', 38000],
      ],
    ),
    gastos: table(
      ['Fecha', 'Descripción', 'Detalle', 'Categoría', 'Método de Pago', 'Monto'],
      [
        [d(0, today), 'Almuerzo salida con familia', 'Restaurante El Leño', 'Comida & Salidas', 'Débito', 120000],
        [d(0, Math.max(1, today - 1)), 'Cumpleaños Sara', 'Regalo + pastel sorpresa', 'Celebraciones & Regalos', 'Tarjeta de Crédito', 185000],
        [d(0, Math.max(1, today - 2)), 'Fiesta bebidas', 'Compra licores y snacks reunión', 'Ocio & Eventos', 'Efectivo', 95000],
        [d(0, Math.max(1, today - 3)), 'Pago Tarjeta X (Banco Visa)', 'Cuota mensual diferida', 'Pago Tarjetas', 'Transferencia', 450000],
        [d(0, Math.max(1, today - 5)), 'Café y postre reunión amigos', 'Salida tarde charla', 'Comida & Salidas', 'Débito', 32000],
        [d(0, Math.max(1, today - 7)), 'Gasolina fin de semana', 'Tanqueada ruta', 'Transporte', 'Tarjeta de Crédito', 88000],
        [d(-1, 20), 'Mercado del mes', 'Supermercado', 'Mercado', 'Débito', 620000],
        [d(-1, 12), 'Cine y comida', 'Plan de fin de semana', 'Ocio & Eventos', 'Tarjeta de Crédito', 90000],
        [d(-1, 18), 'Pago Tarjeta X (Banco Visa)', 'Cuota mensual diferida', 'Pago Tarjetas', 'Transferencia', 450000],
        [d(-2, 19), 'Mercado del mes', 'Supermercado', 'Mercado', 'Débito', 580000],
        [d(-2, 18), 'Pago Tarjeta X (Banco Visa)', 'Cuota mensual diferida', 'Pago Tarjetas', 'Transferencia', 450000],
        [d(-2, 9), 'Regalo aniversario', 'Cena y detalle', 'Celebraciones & Regalos', 'Tarjeta de Crédito', 210000],
      ],
    ),
  };
}
