import { Injectable, signal } from '@angular/core';
import { endOfMonth, sameMonth, toIsoDate } from './dates';
import type { PrimaSugerida } from './finance.store';

export type FormKind = 'gasto' | 'ingreso' | 'fijo' | 'meta' | 'salario' | 'prima';

@Injectable({ providedIn: 'root' })
export class UiService {
  readonly form = signal<FormKind | null>(null);
  /** Valores iniciales para el formulario que se abre (p. ej. la prima sugerida). */
  readonly prefill = signal<Record<string, unknown> | null>(null);
  readonly toast = signal<{ text: string; error?: boolean } | null>(null);
  /** Reloj compartido para textos relativos ("hace 3 min"). */
  readonly now = signal(Date.now());

  private toastTimer?: ReturnType<typeof setTimeout>;

  constructor() {
    setInterval(() => this.now.set(Date.now()), 30_000);
  }

  open(kind: FormKind, prefill: Record<string, unknown> | null = null): void {
    this.prefill.set(prefill);
    this.form.set(kind);
  }

  /** Abre el cálculo de la prima con el período y la base sugeridos. */
  openPrima(prima: PrimaSugerida): void {
    const hoy = new Date();
    const fecha = hoy < prima.limite && sameMonth(hoy, prima.limite) ? hoy : prima.limite;
    this.open('prima', {
      completa: prima.completa ? 'si' : 'no',
      desde: toIsoDate(prima.desde),
      hasta: toIsoDate(prima.hasta),
      base: prima.base,
      fecha: toIsoDate(fecha),
      mes: prima.mes,
      inicioSemestre: toIsoDate(prima.semestre.inicio),
      finSemestre: toIsoDate(prima.semestre.fin),
    });
  }

  /** Abre el registro del salario variable de un mes. */
  openSalario(month: Date): void {
    const hoy = new Date();
    this.open('salario', { fecha: toIsoDate(sameMonth(hoy, month) ? hoy : endOfMonth(month)), monto: null });
  }

  notify(text: string, error = false): void {
    clearTimeout(this.toastTimer);
    this.toast.set({ text, error });
    this.toastTimer = setTimeout(() => this.toast.set(null), 3500);
  }
}

export function timeAgo(date: Date | null, now: number): string {
  if (!date) return 'sin sincronizar';
  const mins = Math.floor((now - date.getTime()) / 60000);
  if (mins < 1) return 'justo ahora';
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `hace ${hours} h` : `hace ${Math.floor(hours / 24)} d`;
}
