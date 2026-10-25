import { primaPara } from './finance.store';
import { calcularPrima, desgloseSalario, dias360 } from './nomina';
import { mapRows, toDate, toNumber } from './parse';

describe('parse', () => {
  it('interpreta montos en formato colombiano e internacional', () => {
    expect(toNumber(4200000)).toBe(4200000);
    expect(toNumber('$ 1.200.000')).toBe(1200000);
    expect(toNumber('1,200,000')).toBe(1200000);
    expect(toNumber('1.234,50')).toBe(1234.5);
    expect(toNumber('1,234.50')).toBe(1234.5);
    expect(toNumber('12.5')).toBe(12.5);
    expect(toNumber('')).toBe(0);
  });

  it('interpreta fechas dd/mm/yyyy, ISO y número de serie', () => {
    expect(toDate('23/10/2026')).toEqual(new Date(2026, 9, 23));
    expect(toDate('2026-10-23')).toEqual(new Date(2026, 9, 23));
    expect(toDate(46318)?.getFullYear()).toBe(2026);
    expect(toDate('hola')).toBeNull();
  });

  it('mapea columnas por alias sin importar tildes ni mayúsculas', () => {
    const table = { headers: ['VALOR', 'Concepto'], rows: [{ rowNumber: 2, cells: ['50.000', 'Taxi'] }] };
    const rows = mapRows(table, { monto: ['monto', 'valor'], desc: ['descripcion', 'concepto'] }, (get, row) => ({
      row,
      monto: toNumber(get('monto')),
      desc: get('desc'),
    }));
    expect(rows).toEqual([{ row: 2, monto: 50000, desc: 'Taxi' }]);
  });

  it('cuenta días con meses comerciales de 30 días', () => {
    expect(dias360(new Date(2026, 6, 1), new Date(2026, 11, 31))).toBe(180);
    expect(dias360(new Date(2026, 0, 1), new Date(2026, 5, 30))).toBe(180);
    expect(dias360(new Date(2026, 8, 18), new Date(2026, 11, 31))).toBe(103);
    expect(dias360(new Date(2026, 1, 1), new Date(2026, 1, 28))).toBe(30);
    expect(dias360(new Date(2026, 11, 31), new Date(2026, 6, 1))).toBe(0);
  });

  it('calcula la prima completa o proporcional a los días trabajados', () => {
    expect(calcularPrima(5000000, new Date(2026, 6, 1), new Date(2026, 11, 31))).toEqual({ dias: 180, monto: 2500000 });
    expect(calcularPrima(5000000, new Date(2026, 8, 18), new Date(2026, 11, 31))).toEqual({ dias: 103, monto: 1430556 });
  });

  it('sugiere la prima solo en junio y diciembre, desde la fecha de ingreso', () => {
    const completa = primaPara(new Date(2026, 5, 1), 5000000);
    expect(completa).toMatchObject({ mes: 'junio', monto: 2500000, dias: 180, completa: true, limite: new Date(2026, 5, 30) });
    const parcial = primaPara(new Date(2026, 11, 1), 5000000, new Date(2026, 8, 18));
    expect(parcial).toMatchObject({ mes: 'diciembre', dias: 103, monto: 1430556, completa: false, limite: new Date(2026, 11, 20) });
    expect(primaPara(new Date(2026, 5, 1), 5000000, new Date(2026, 8, 18))).toBeNull();
    expect(primaPara(new Date(2026, 9, 1), 5000000)).toBeNull();
    expect(primaPara(new Date(2026, 5, 1), 0)).toBeNull();
  });

  it('calcula el salario neto descontando 4% salud y 4% pensión', () => {
    expect(desgloseSalario(5000000)).toEqual({ bruto: 5000000, salud: 200000, pension: 200000, neto: 4600000 });
    expect(desgloseSalario(0).neto).toBe(0);
  });
});
