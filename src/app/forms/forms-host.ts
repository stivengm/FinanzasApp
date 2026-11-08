import { Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { FormBuilder, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { endOfMonth, toIsoDate } from '../core/dates';
import { estadoDeuda, interesDelMes, mesesParaPagar, tasaMensualDesdeEA } from '../core/deudas';
import { TipoAbono } from '../core/models';
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
  deuda: 'Nueva deuda',
  abono: 'Registrar pago de deuda',
};

const TIPOS_ABONO: { valor: TipoAbono; detalle: string }[] = [
  { valor: 'Cuota', detalle: 'Pago de la cuota del mes' },
  { valor: 'Abono a capital', detalle: 'Pago extra para bajar la deuda' },
  { valor: 'Pago total', detalle: 'Saldar todo lo que falta' },
];
const TIPOS_PAGO_TARJETA: { valor: TipoAbono; detalle: string }[] = [
  { valor: 'Pago parcial', detalle: 'Pagar una parte (mínimo u otro valor)' },
  { valor: 'Pago total', detalle: 'Pagar toda la deuda de la tarjeta' },
];

const METODO_CREDITO = 'Tarjeta de Crédito';
const CATEGORIA_PAGO_TARJETA = 'Pago Tarjetas';

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
    /** Tarjeta con la que se compra, o la que se paga si la categoría es "Pago Tarjetas". */
    tarjeta: [''],
  });
  private readonly gastoValor = toSignal(this.gasto.valueChanges, { initialValue: this.gasto.getRawValue() });
  /** Qué pide el campo de tarjeta en el gasto: la tarjeta que se paga, la de la compra, o nada. */
  protected readonly gastoTarjeta = computed<'pago' | 'compra' | null>(() => {
    const v = { ...this.gasto.getRawValue(), ...this.gastoValor() };
    if (!this.store.tarjetas().length) return null;
    if (v.categoria === CATEGORIA_PAGO_TARJETA) return 'pago';
    return v.metodoPago === METODO_CREDITO ? 'compra' : null;
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
    /** Tarjeta a la que se cobra (vacío = se paga directo). */
    tarjeta: [''],
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

  /** Deuda: con o sin interés; la tasa puede venir mensual o efectiva anual (E.A.). */
  protected readonly deuda = this.fb.group({
    tipoDeuda: ['Préstamo'],
    nombre: ['', Validators.required],
    acreedor: [''],
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    cupo: new FormControl<number | null>(null),
    diaPago: new FormControl<number | null>(null, [Validators.min(1), Validators.max(31)]),
    fecha: [toIsoDate(new Date()), Validators.required],
    conInteres: ['no'],
    tasa: new FormControl<number | null>(null),
    tipoTasa: ['mensual'],
    cuota: new FormControl<number | null>(null),
  });
  private readonly deudaValor = toSignal(this.deuda.valueChanges, { initialValue: this.deuda.getRawValue() });
  protected readonly deudaCalculo = computed(() => {
    const v = { ...this.deuda.getRawValue(), ...this.deudaValor() };
    const monto = Number(v.monto) || 0;
    const tasaIngresada = Number(v.tasa) || 0;
    const tasaMensual = v.conInteres === 'si' ? (v.tipoTasa === 'ea' ? tasaMensualDesdeEA(tasaIngresada) : tasaIngresada) : 0;
    const cuota = Number(v.cuota) || 0;
    return {
      tasaMensual,
      interesPrimerMes: interesDelMes(monto, tasaMensual),
      meses: cuota > 0 && monto > 0 ? mesesParaPagar(monto, tasaMensual, cuota) : undefined,
    };
  });

  /** Pago a una deuda: cuota, abono a capital o pago total, con su razón. */
  protected readonly tiposAbono = computed(() => (this.abonoCalculo()?.deuda.tipo === 'Tarjeta' ? TIPOS_PAGO_TARJETA : TIPOS_ABONO));
  protected readonly abono = this.fb.group({
    deudaId: ['', Validators.required],
    tipo: ['Cuota'],
    monto: new FormControl<number | null>(null, [Validators.required, Validators.min(1)]),
    fecha: [toIsoDate(new Date()), Validators.required],
    nota: [''],
  });
  private readonly abonoValor = toSignal(this.abono.valueChanges, { initialValue: this.abono.getRawValue() });
  protected readonly deudasActivas = computed(() => this.store.estadosDeuda().filter((e) => !e.pagada && e.saldo > 0));
  /** Simula el pago para mostrar cuánto va a interés, cuánto a capital y el saldo que queda. */
  protected readonly abonoCalculo = computed(() => {
    const v = { ...this.abono.getRawValue(), ...this.abonoValor() };
    const deuda = this.store.deudas().find((d) => d.id === v.deudaId);
    const fecha = toDate(v.fecha ?? '') ?? new Date();
    if (!deuda) return null;
    const cargos = this.store.cargosTarjeta();
    const saldo = estadoDeuda(deuda, this.store.abonos(), endOfMonth(fecha), cargos).saldo;
    const monto = Number(v.monto) || 0;
    const prueba = { row: -1, fecha, deudaId: deuda.id, deuda: deuda.nombre, tipo: v.tipo ?? '', monto, nota: '' };
    const mov = estadoDeuda(deuda, [...this.store.abonos(), prueba], endOfMonth(fecha), cargos).movimientos.find((m) => m.abono === prueba);
    return { deuda, saldo, interes: mov?.interes ?? 0, capital: mov?.capital ?? 0, saldoDespues: Math.max(saldo - monto, 0), excede: monto > saldo };
  });

  constructor() {
    // Al pedir tarjeta en un gasto, preselecciona la primera.
    effect(() => {
      if (this.gastoTarjeta() && !this.gasto.controls.tarjeta.value) {
        this.gasto.controls.tarjeta.setValue(this.store.tarjetas()[0]?.id ?? '');
      }
    });
    // Una tarjeta casi siempre cobra interés E.A.
    this.deuda.controls.tipoDeuda.valueChanges.subscribe((tipo) => {
      if (tipo === 'Tarjeta') this.deuda.patchValue({ conInteres: 'si', tipoTasa: 'ea' });
    });

    // "Pago total" llena el monto con el saldo pendiente.
    this.abono.controls.tipo.valueChanges.subscribe((tipo) => {
      if (tipo === 'Pago total') queueMicrotask(() => this.abono.controls.monto.setValue(this.abonoCalculo()?.saldo ?? null));
    });

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
          const tarjeta = this.store.tarjetas().find((t) => t.id === v.tarjeta);
          if (this.gastoTarjeta() === 'pago' && tarjeta) {
            // Pagar una tarjeta no es un gasto nuevo: se registra como pago de esa deuda.
            const saldo = this.store.estadosDeuda().find((e) => e.deuda.id === tarjeta.id)?.saldo ?? 0;
            const monto = v.monto ?? 0;
            await this.store.addAbono({
              deuda: tarjeta,
              tipo: monto >= saldo ? 'Pago total' : 'Pago parcial',
              monto,
              fecha: toDate(v.fecha) ?? new Date(),
              nota: v.descripcion.trim(),
            });
            form.reset();
            this.close();
            this.ui.notify(`Registrado como pago de ${tarjeta.nombre}`);
            return;
          }
          await this.store.addGasto({
            ...v,
            monto: v.monto ?? 0,
            fecha: toDate(v.fecha),
            tarjeta: this.gastoTarjeta() === 'compra' && tarjeta ? tarjeta.id : '',
          });
          break;
        }
        case 'ingreso': {
          const v = this.ingreso.getRawValue();
          await this.store.addIngreso({ ...v, monto: v.monto ?? 0, fecha: toDate(v.fecha) });
          break;
        }
        case 'fijo': {
          const v = this.fijo.getRawValue();
          await this.store.addFijo({ ...v, monto: v.monto ?? 0, tarjeta: v.tarjeta });
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
        case 'deuda': {
          const v = this.deuda.getRawValue();
          const esTarjeta = v.tipoDeuda === 'Tarjeta';
          if (!esTarjeta && !((v.monto ?? 0) > 0)) {
            this.ui.notify('Indica el monto de la deuda', true);
            return;
          }
          if (v.conInteres === 'si' && !(Number(v.tasa) > 0)) {
            this.ui.notify('Indica el porcentaje de interés o marca "Sin interés"', true);
            return;
          }
          await this.store.addDeuda({
            nombre: v.nombre.trim(),
            acreedor: v.acreedor.trim(),
            monto: v.monto ?? 0,
            fecha: toDate(v.fecha),
            tasaMensual: Math.round(this.deudaCalculo().tasaMensual * 10000) / 10000,
            cuota: esTarjeta ? 0 : Number(v.cuota) || 0,
            tipo: esTarjeta ? 'Tarjeta' : 'Préstamo',
            cupo: esTarjeta ? Number(v.cupo) || 0 : 0,
            diaPago: esTarjeta ? Number(v.diaPago) || null : null,
          });
          break;
        }
        case 'abono': {
          const v = this.abono.getRawValue();
          const calc = this.abonoCalculo();
          if (!calc) return;
          if (calc.excede) {
            this.ui.notify(`El pago supera el saldo pendiente`, true);
            return;
          }
          await this.store.addAbono({
            deuda: calc.deuda,
            tipo: v.tipo as TipoAbono,
            monto: v.monto ?? 0,
            fecha: toDate(v.fecha) ?? new Date(),
            nota: v.nota.trim(),
          });
          if (calc.saldoDespues <= 0) {
            form.reset();
            this.close();
            this.ui.notify(`¡${calc.deuda.nombre} quedó pagada!`);
            return;
          }
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
