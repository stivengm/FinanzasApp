import { estadoDeuda, mesesParaPagar, tasaMensualDesdeEA } from './deudas';
import { Abono, Deuda } from './models';

const deuda = (extra: Partial<Deuda> = {}): Deuda => ({
  row: 2,
  id: 'D1',
  nombre: 'Crédito',
  acreedor: 'Banco',
  monto: 5000000,
  fecha: new Date(2026, 7, 10),
  tasaMensual: 0,
  cuota: 0,
  ...extra,
});

const abono = (fecha: Date, monto: number, extra: Partial<Abono> = {}): Abono => ({
  row: 2,
  fecha,
  deudaId: 'D1',
  deuda: 'Crédito',
  tipo: 'Cuota',
  monto,
  nota: '',
  ...extra,
});

describe('deudas', () => {
  it('sin interés: el saldo baja exactamente lo que se abona', () => {
    const abonos = [abono(new Date(2026, 8, 5), 1000000), abono(new Date(2026, 9, 5), 500000)];
    const e = estadoDeuda(deuda(), abonos, new Date(2026, 9, 31));
    expect(e.saldo).toBe(3500000);
    expect(e.interesesTotales).toBe(0);
    expect(e.movimientos.map((m) => m.capital)).toEqual([500000, 1000000]);
  });

  it('con interés: cada mes suma interés sobre el saldo y el pago cubre primero el interés', () => {
    // 2% mensual. Ago: préstamo (sin interés ese mes). Sep: +100.000 de interés, paga 600.000.
    const e = estadoDeuda(deuda({ tasaMensual: 2 }), [abono(new Date(2026, 8, 15), 600000)], new Date(2026, 8, 30));
    expect(e.interesMes).toBe(100000);
    expect(e.movimientos[0]).toMatchObject({ interes: 100000, capital: 500000, saldoDespues: 4500000 });
    expect(e.saldo).toBe(4500000);
  });

  it('acumula interés en los meses sin pago', () => {
    const e = estadoDeuda(deuda({ tasaMensual: 2 }), [], new Date(2026, 9, 31));
    // Sep: 5.000.000 × 2% = 100.000; Oct: 5.100.000 × 2% = 102.000
    expect(e.interesesTotales).toBe(202000);
    expect(e.saldo).toBe(5202000);
  });

  it('marca la deuda como pagada con el pago total', () => {
    const e = estadoDeuda(deuda(), [abono(new Date(2026, 8, 1), 5000000, { tipo: 'Pago total' })], new Date(2026, 8, 30));
    expect(e.pagada).toBe(true);
    expect(e.saldo).toBe(0);
    expect(e.mesesRestantes).toBe(0);
  });

  it('ignora abonos de otras deudas y posteriores a la fecha consultada', () => {
    const abonos = [abono(new Date(2026, 8, 5), 100000, { deudaId: 'OTRA' }), abono(new Date(2026, 11, 5), 100000)];
    expect(estadoDeuda(deuda(), abonos, new Date(2026, 9, 31)).saldo).toBe(5000000);
  });

  it('estima los meses para pagar con la cuota pactada', () => {
    expect(mesesParaPagar(1000000, 0, 250000)).toBe(4);
    expect(mesesParaPagar(1000000, 2, 100000)).toBe(12);
    expect(mesesParaPagar(1000000, 2, 20000)).toBeNull();
    expect(mesesParaPagar(1000000, 2, 0)).toBeNull();
  });

  it('convierte tasa efectiva anual a mensual', () => {
    expect(tasaMensualDesdeEA(26.82)).toBeCloseTo(2, 2);
  });
});
