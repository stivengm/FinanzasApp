import { Component, computed, effect, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toIsoDate } from '../core/dates';
import { FinanceStore } from '../core/finance.store';
import { toDate } from '../core/parse';
import { SessionService } from '../core/session.service';
import { FormKind, UiService } from '../core/ui.service';
import { BottomSheet } from '../shared/bottom-sheet';

export const CATEGORIAS_GASTO = [
  'Comida & Salidas',
  'Celebraciones & Regalos',
  'Ocio & Eventos',
  'Pago Tarjetas',
  'Transporte',
  'Mercado',
  'Salud',
  'Hogar',
  'Otros',
];
const METODOS = ['Débito', 'Tarjeta de Crédito', 'Efectivo', 'Transferencia'];
const TIPOS_INGRESO = ['Extra', 'Prima', 'Bonificación', 'Renta', 'Otro'];
const FRECUENCIAS_FIJO = ['Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual'];

const TITLES: Record<FormKind, string> = {
  gasto: 'Registrar gasto',
  ingreso: 'Nuevo ingreso del mes',
  fijo: 'Nueva responsabilidad fija',
  meta: 'Nuevo objetivo de ahorro',
};

@Component({
  selector: 'app-forms-host',
  imports: [ReactiveFormsModule, NgTemplateOutlet, BottomSheet],
  templateUrl: './forms-host.html',
})
export class FormsHost {
  protected readonly ui = inject(UiService);
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly categorias = CATEGORIAS_GASTO;
  protected readonly metodos = METODOS;
  protected readonly tiposIngreso = TIPOS_INGRESO;
  protected readonly frecuencias = FRECUENCIAS_FIJO;
  protected readonly title = computed(() => {
    const kind = this.ui.form();
    return kind ? TITLES[kind] : '';
  });

  protected readonly gasto = this.fb.group({
    descripcion: ['', Validators.required],
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: [toIsoDate(new Date()), Validators.required],
    categoria: [CATEGORIAS_GASTO[0]],
    metodoPago: [METODOS[0]],
    detalle: [''],
  });

  protected readonly ingreso = this.fb.group({
    fuente: ['', Validators.required],
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: [toIsoDate(new Date()), Validators.required],
    tipo: ['Extra'],
    descripcion: [''],
  });

  protected readonly fijo = this.fb.group({
    servicio: ['', Validators.required],
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    diaPago: [5, [Validators.min(1), Validators.max(31)]],
    frecuencia: ['Mensual'],
    proveedor: [''],
    categoria: ['Servicios'],
  });

  protected readonly meta = this.fb.group({
    objetivo: ['', Validators.required],
    meta: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    ahorrado: [0],
    aporteMensual: [0],
    descripcion: [''],
  });

  constructor() {
    // Aplica los valores sugeridos (p. ej. la prima) al abrir el formulario.
    effect(() => {
      const kind = this.ui.form();
      const prefill = this.ui.prefill();
      if (kind && prefill) (this[kind] as FormGroup).patchValue(prefill);
    });
  }

  protected close(): void {
    this.ui.form.set(null);
    this.ui.prefill.set(null);
  }

  protected async submit(kind: FormKind): Promise<void> {
    const form = this[kind];
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    try {
      switch (kind) {
        case 'gasto': {
          const v = this.gasto.getRawValue();
          await this.store.addGasto({ ...v, monto: v.monto ?? 0, fecha: toDate(v.fecha) });
          break;
        }
        case 'ingreso': {
          const v = this.ingreso.getRawValue();
          await this.store.addIngreso({ ...v, monto: v.monto ?? 0, fecha: toDate(v.fecha) });
          break;
        }
        case 'fijo': {
          const v = this.fijo.getRawValue();
          await this.store.addFijo({ ...v, monto: v.monto ?? 0 });
          break;
        }
        case 'meta': {
          const v = this.meta.getRawValue();
          await this.store.addMeta({ ...v, meta: v.meta ?? 0 });
          break;
        }
      }
      form.reset();
      this.close();
      this.ui.notify(this.session.isDemo() ? 'Guardado (modo demo)' : 'Guardado en Google Sheets');
    } catch (e) {
      this.ui.notify((e as Error).message, true);
    }
  }
}
