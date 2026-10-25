import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { addMonths } from '../../core/dates';
import { FinanceStore, primaPara } from '../../core/finance.store';
import { TipoSalario } from '../../core/models';
import { toDate } from '../../core/parse';
import { desgloseSalario } from '../../core/nomina';
import { SessionService } from '../../core/session.service';
import { UiService } from '../../core/ui.service';
import { MoneyPipe } from '../../shared/format';

@Component({
  selector: 'app-perfil',
  imports: [FormsModule, RouterLink, MoneyPipe],
  templateUrl: './perfil.html',
})
export class PerfilPage {
  protected readonly store = inject(FinanceStore);
  protected readonly session = inject(SessionService);
  private readonly ui = inject(UiService);
  private readonly router = inject(Router);

  protected readonly bienvenida = !!inject(ActivatedRoute).snapshot.queryParamMap.get('bienvenida');

  protected readonly nombre = linkedSignal(() => this.store.perfil()?.nombre ?? '');
  protected readonly salario = linkedSignal<number | null>(() => this.store.perfil()?.salario || null);
  protected readonly tipoSalario = linkedSignal<TipoSalario>(() => this.store.perfil()?.tipoSalario ?? 'Fijo');
  protected readonly fechaIngreso = linkedSignal(() => this.store.perfil()?.fechaIngreso ?? '');
  protected readonly tipos: { valor: TipoSalario; titulo: string; detalle: string }[] = [
    { valor: 'Fijo', titulo: 'Salario fijo', detalle: 'Gano lo mismo cada mes' },
    { valor: 'Variable', titulo: 'Salario variable', detalle: 'Cambia de un mes a otro' },
  ];
  protected readonly error = signal<string | null>(null);

  protected readonly desglose = computed(() => desgloseSalario(Number(this.salario()) || 0));
  /** Próxima prima con el salario y la fecha de ingreso escritos (aún sin guardar). */
  protected readonly proximaPrima = computed(() => {
    if (this.tipoSalario() !== 'Fijo') return null;
    for (let i = 0; i < 12; i++) {
      const prima = primaPara(addMonths(new Date(), i), this.desglose().bruto, toDate(this.fechaIngreso() || null));
      if (prima) return prima;
    }
    return null;
  });

  protected readonly inicial = computed(() => {
    const p = this.store.perfil();
    return (p?.nombre || p?.usuario || '?').charAt(0).toUpperCase();
  });

  protected async guardar(): Promise<void> {
    this.error.set(null);
    try {
      await this.store.updatePerfil({
        nombre: this.nombre().trim(),
        salario: Number(this.salario()) || 0,
        tipoSalario: this.tipoSalario(),
        fechaIngreso: this.fechaIngreso() || '',
      });
      this.ui.notify('Perfil actualizado');
      if (this.bienvenida) this.router.navigate(['/inicio']);
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
}
