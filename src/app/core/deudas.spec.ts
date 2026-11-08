import { estadoDeuda, mesesParaPagar, tasaMensualDesdeEA } from './deudas';
import { Abono, CargoTarjeta, Deuda } from './models';

const deuda = (extra: Partial<Deuda> = {}): Deuda => ({
  row: 2,
  id: 'D1',
  nombre: 'Crédito',
  acreedor: 'Banco',
  monto: 5000000,
  fecha: new Date(2026, 7, 10),
  tasaMensual: 0,
  cuota: 0,
  tipo: 'Préstamo',
  cupo: 0,
  diaPago: null,
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

  describe('tarjeta de crédito', () => {
    const visa = deuda({ id: 'V', tipo: 'Tarjeta', monto: 0, fecha: new Date(2026, 8, 1), tasaMensual: 2, cupo: 8000000, diaPago: 15 });
    const compra = (fecha: Date, monto: number): CargoTarjeta => ({ fecha, tarjeta: 'V', descripcion: 'Compra', monto, origen: 'Gastos', row: 5 });
    const pago = (fecha: Date, monto: number) => abono(fecha, monto, { deudaId: 'V', tipo: 'Pago total' });
    const compras = [compra(new Date(2026, 8, 10), 1000000)];

    it('las compras suben el saldo y el cupo disponible baja', () => {
      const e = estadoDeuda(visa, [], new Date(2026, 8, 30), compras, new Date(2026, 8, 20));
      expect(e).toMatchObject({ saldo: 1000000, comprasMes: 1000000, disponible: 7000000, pagada: false });
      expect(e.movimientos[0]).toMatchObject({ tipo: 'Compra', esCargo: true });
    });

    it('si se paga el total del mes anterior no cobra interés', () => {
      const e = estadoDeuda(visa, [pago(new Date(2026, 9, 5), 1000000)], new Date(2026, 10, 30), compras, new Date(2026, 11, 15));
      expect(e).toMatchObject({ saldo: 0, interesesTotales: 0, pagada: false });
    });

    it('cobra interés solo sobre lo que quedó sin pagar, al cerrar el mes', () => {
      const parcial = [pago(new Date(2026, 9, 5), 400000)];
      // Oct: quedaron 600.000 sin pagar → 12.000 de interés. Nov (cerrado): 612.000 × 2% = 12.240.
      const cerrado = estadoDeuda(visa, parcial, new Date(2026, 10, 30), compras, new Date(2026, 11, 15));
      expect(cerrado.saldo).toBe(624240);
      expect(cerrado.interesMes).toBe(12240);
      // Noviembre en curso: todavía no se cobra el interés del mes.
      const enCurso = estadoDeuda(visa, parcial, new Date(2026, 10, 30), compras, new Date(2026, 10, 20));
      expect(enCurso).toMatchObject({ saldo: 612000, interesMes: 0, porPagarMes: 612000 });
    });
  });

  it('convierte tasa efectiva anual a mensual', () => {
    expect(tasaMensualDesdeEA(26.82)).toBeCloseTo(2, 2);
  });
});
