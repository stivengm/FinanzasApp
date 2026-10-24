import { Cell, SheetTable } from './models';

export function normalize(text: unknown): string {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export function toNumber(value: Cell): number {
  if (typeof value === 'number') return value;
  if (value == null || value instanceof Date) return 0;
  let s = String(value).replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const lastDot = s.lastIndexOf('.');
  const lastComma = s.lastIndexOf(',');
  if (lastDot >= 0 && lastComma >= 0) {
    // El último separador es el decimal.
    s = lastComma > lastDot ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  } else {
    const sep = lastDot >= 0 ? '.' : lastComma >= 0 ? ',' : '';
    if (sep) {
      const parts = s.split(sep);
      const thousands = parts.length > 2 || parts[parts.length - 1].length === 3;
      s = thousands ? parts.join('') : parts.join('.');
    }
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function toDate(value: Cell): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    // Número de serie de Sheets (días desde 1899-12-30).
    if (value > 20000 && value < 80000) return new Date(Date.UTC(1899, 11, 30) + value * 86400000 + new Date().getTimezoneOffset() * 60000);
    return null;
  }
  if (!value) return null;
  const s = String(value).trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
  if (m) {
    const year = +m[3] < 100 ? 2000 + +m[3] : +m[3];
    return new Date(year, +m[2] - 1, +m[1]);
  }
  return null;
}

export function toText(value: Cell): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toLocaleDateString('es-CO');
  return String(value).trim();
}

/**
 * Convierte cada fila en un objeto usando alias de encabezado,
 * así la app tolera variaciones como "Valor" en lugar de "Monto".
 */
export function mapRows<T>(
  table: SheetTable,
  aliases: Record<string, string[]>,
  build: (get: (field: string) => Cell, rowNumber: number) => T | null,
): T[] {
  const headers = table.headers.map(normalize);
  const index: Record<string, number> = {};
  for (const [field, names] of Object.entries(aliases)) {
    const keys = names.map(normalize);
    let i = headers.findIndex((h) => keys.includes(h));
    if (i < 0) i = headers.findIndex((h) => h && keys.some((k) => h.startsWith(k)));
    index[field] = i;
  }
  const out: T[] = [];
  for (const row of table.rows) {
    const get = (field: string) => (index[field] >= 0 ? (row.cells[index[field]] ?? null) : null);
    const item = build(get, row.rowNumber);
    if (item) out.push(item);
  }
  return out;
}
