import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { toIsoDate } from '../core/dates';
import { FinanceStore } from '../core/finance.store';
import { DIAS_SEMESTRE, calcularPrima, desgloseSalario } from '../core/nomina';
import { toDate } from '../core/parse';
import { SessionService } from '../core/session.service';
import { FormKind, UiService } from '../core/ui.service';
import { BottomSheet } from '../shared/bottom-sheet';
import { MoneyPipe } from '../shared/format';

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
  salario: 'Salario del mes',
  prima: 'Prima de servicios',
};

@Component({
  selector: 'app-forms-host',
  imports: [ReactiveFormsModule, NgTemplateOutlet, BottomSheet, MoneyPipe],
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

  /** Salario variable del mes, en bruto. */
  protected readonly salario = this.fb.group({
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: [toIsoDate(new Date()), Validators.required],
  });
  private readonly salarioValor = toSignal(this.salario.controls.monto.valueChanges, { initialValue: null });
  protected readonly salarioDesglose = computed(() => desgloseSalario(Number(this.salarioValor()) || 0));

  /** Prima: semestre completo o período parcial (desde/hasta) sobre un salario base. */
  protected readonly prima = this.fb.group({
    completa: ['si'],
    desde: ['', Validators.required],
    hasta: ['', Validators.required],
    base: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: [toIsoDate(new Date()), Validators.required],
    mes: [''],
    inicioSemestre: [''],
    finSemestre: [''],
  });
  private readonly primaValor = toSignal(this.prima.valueChanges, { initialValue: this.prima.getRawValue() });
  protected readonly diasSemestre = DIAS_SEMESTRE;
  protected readonly primaCalculo = computed(() => {
    const v = { ...this.prima.getRawValue(), ...this.primaValor() };
    const desde = toDate(v.desde ?? '');
    const hasta = toDate(v.hasta ?? '');
    if (!desde || !hasta) return { dias: 0, monto: 0, valido: false };
    const { dias, monto } = calcularPrima(Number(v.base) || 0, desde, hasta);
    return { dias, monto, valido: dias > 0 && hasta >= desde };
  });

  constructor() {
    // "Semestre completo" fija el período a todo el semestre.
    this.prima.controls.completa.valueChanges.subscribe((completa) => {
      if (completa === 'si') {
        const { inicioSemestre, finSemestre } = this.prima.getRawValue();
        this.prima.patchValue({ desde: inicioSemestre, hasta: finSemestre });
      }
    });

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
        case 'salario': {
          const v = this.salario.getRawValue();
          await this.store.addSalarioMes(v.monto ?? 0, toDate(v.fecha) ?? new Date());
          break;
        }
        case 'prima': {
          const v = this.prima.getRawValue();
          const calc = this.primaCalculo();
          if (!calc.valido) return;
          await this.store.addPrima({
            mes: v.mes,
            desde: toDate(v.desde)!,
            hasta: toDate(v.hasta)!,
            dias: calc.dias,
            monto: calc.monto,
            fecha: toDate(v.fecha) ?? new Date(),
          });
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
